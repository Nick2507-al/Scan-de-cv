# routers/stats.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from db import get_connection
from .auth import get_current_user
from datetime import datetime, timedelta
import json
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io

router = APIRouter()

# Statistiques Candidat (données réelles, sans fictif)
@router.get("/user/candidat", response_model=dict)
async def candidate_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "candidat":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux candidats")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Profil
        profile = {
            "name": f"{current_user.get('prenom','')} {current_user.get('nom','')}",
            "email": current_user.get("email",""),
            "registration_date": None,
            "last_active": None,
            "profile_completion": 100
        }
        cursor.execute("SELECT date_creation FROM utilisateurs WHERE id=%s", (current_user["id"],))
        r = cursor.fetchone()
        if r and r.get("date_creation"):
            dt = r["date_creation"]
            profile["registration_date"] = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)

        # Activité
        cursor.execute("SELECT COUNT(*) AS cnt FROM candidatures WHERE candidat_id=%s", (current_user["id"],))
        total_applications = int(cursor.fetchone().get("cnt", 0))

        cursor.execute(
            "SELECT AVG(score_ia) AS avg_score FROM candidatures WHERE candidat_id=%s AND score_ia IS NOT NULL",
            (current_user["id"],)
        )
        avg_score = cursor.fetchone().get("avg_score")
        avg_score = float(avg_score) if avg_score is not None else 0.0

        cursor.execute(
            "SELECT COUNT(*) AS responded FROM candidatures WHERE candidat_id=%s AND statut != 'en_attente'",
            (current_user["id"],)
        )
        responded = int(cursor.fetchone().get("responded", 0))
        response_rate = round((responded / total_applications) * 100, 1) if total_applications > 0 else 0.0

        # Time series candidatures par mois (12 derniers mois)
        cursor.execute(
            """
            SELECT DATE_FORMAT(date_candidature, '%Y-%m') AS mois, COUNT(*) AS c
            FROM candidatures
            WHERE candidat_id=%s
            AND date_candidature >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(date_candidature, '%Y-%m')
            ORDER BY mois
            """,
            (current_user["id"],)
        )
        apps_month = [{"month": row["mois"], "count": row["c"]} for row in cursor.fetchall()]

        # Liste des candidatures (réelles)
        cursor.execute(
            """
            SELECT c.id, o.titre AS job_title, o.recruteur_id, c.date_candidature, c.statut, c.score_ia
            FROM candidatures c JOIN offres_emploi o ON o.id = c.offre_emploi_id
            WHERE c.candidat_id=%s ORDER BY c.date_candidature DESC
            """,
            (current_user["id"],)
        )
        apps = []
        for row in cursor.fetchall():
            apps.append({
                "id": f"app_{row['id']}",
                "job_title": row["job_title"],
                "company": str(row["recruteur_id"]),
                "applied_date": row["date_candidature"].isoformat() if hasattr(row["date_candidature"], "isoformat") else str(row["date_candidature"]),
                "status": "accepted" if row["statut"] == "acceptee" else ("rejected" if row["statut"] == "refusee" else ("reviewed" if row["statut"] != "en_attente" else "pending")),
                "match_score": float(row["score_ia"]) if row.get("score_ia") is not None else None
            })

        return {
            "user_id": str(current_user["id"]),
            "profile": profile,
            "activity_summary": {
                "total_applications": total_applications,
                "total_cv_uploads": 0,
                "total_profile_views": 0,
                "total_searches": 0,
                "avg_match_score": round(avg_score, 2),
                "success_rate": 0
            },
            "applications": apps,
            "cv_analyses": [],
            "recent_activity": [],
            "performance_metrics": {
                "application_response_rate": response_rate,
                "profile_view_to_application_ratio": 0,
                "skill_match_accuracy": round(avg_score, 2),
                "career_progression_score": 0
            },
            "time_series_data": {
                "applications_per_month": apps_month,
                "match_scores_evolution": [],
                "activity_heatmap": []
            }
        }
    finally:
        cursor.close(); conn.close()

# Statistiques Entreprise (recruteur) – données réelles
@router.get("/company", response_model=dict)
async def company_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux recruteurs")

    conn = get_connection();
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Profil entreprise (si disponible)
        cursor.execute("SELECT nom_entreprise, secteur_activite, description_entreprise FROM profils_recruteurs WHERE utilisateur_id=%s", (current_user["id"],))
        comp = cursor.fetchone() or {}
        profile = {
            "name": comp.get("nom_entreprise") or f"Entreprise {current_user['id']}",
            "industry": comp.get("secteur_activite") or "",
            "size": "",
            "registration_date": None
        }
        cursor.execute("SELECT date_creation FROM utilisateurs WHERE id=%s", (current_user["id"],))
        u = cursor.fetchone()
        if u and u.get("date_creation"):
            dt = u["date_creation"]
            profile["registration_date"] = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)

        # Offres
        cursor.execute("SELECT COUNT(*) AS c FROM offres_emploi WHERE recruteur_id=%s AND statut='active'", (current_user["id"],))
        total_active = int(cursor.fetchone().get("c", 0))
        cursor.execute("SELECT COUNT(*) AS c FROM offres_emploi WHERE recruteur_id=%s", (current_user["id"],))
        total_posted = int(cursor.fetchone().get("c", 0))

        cursor.execute(
            "SELECT COUNT(*) AS c FROM candidatures c JOIN offres_emploi o ON o.id=c.offre_emploi_id WHERE o.recruteur_id=%s",
            (current_user["id"],)
        )
        total_applications_received = int(cursor.fetchone().get("c", 0))
        avg_applications_per_job = round((total_applications_received / total_posted), 2) if total_posted > 0 else 0

        cursor.execute(
            """
            SELECT o.titre, COUNT(c.id) AS nb
            FROM offres_emploi o LEFT JOIN candidatures c ON c.offre_emploi_id=o.id
            WHERE o.recruteur_id=%s GROUP BY o.id, o.titre ORDER BY nb DESC LIMIT 5
            """,
            (current_user["id"],)
        )
        most_popular_positions = [row["titre"] for row in cursor.fetchall()]

        # Recruitment metrics
        cursor.execute(
            "SELECT COUNT(*) AS c FROM candidatures c JOIN offres_emploi o ON o.id=c.offre_emploi_id WHERE o.recruteur_id=%s AND c.statut!='en_attente'",
            (current_user["id"],)
        )
        applications_reviewed = int(cursor.fetchone().get("c", 0))
        cursor.execute(
            "SELECT COUNT(*) AS c FROM candidatures c JOIN offres_emploi o ON o.id=c.offre_emploi_id WHERE o.recruteur_id=%s AND c.statut='acceptee'",
            (current_user["id"],)
        )
        hires_made = int(cursor.fetchone().get("c", 0))
        cursor.execute(
            "SELECT COUNT(*) AS c FROM candidatures c JOIN offres_emploi o ON o.id=c.offre_emploi_id WHERE o.recruteur_id=%s AND c.statut='preselectionnee'",
            (current_user["id"],)
        )
        candidates_interviewed = int(cursor.fetchone().get("c", 0))

        cursor.execute(
            """
            SELECT AVG(DATEDIFF(NOW(), c.date_candidature)) AS d
            FROM candidatures c JOIN offres_emploi o ON o.id=c.offre_emploi_id
            WHERE o.recruteur_id=%s AND c.statut!='en_attente'
            """,
            (current_user["id"],)
        )
        drow = cursor.fetchone(); avg_time_to_hire = float(drow.get("d", 0) or 0)

        cursor.execute(
            "SELECT AVG(c.score_ia) AS s FROM candidatures c JOIN offres_emploi o ON o.id=c.offre_emploi_id WHERE o.recruteur_id=%s AND c.score_ia IS NOT NULL",
            (current_user["id"],)
        )
        srow = cursor.fetchone(); candidate_quality_score = round(float(srow.get("s", 0) or 0), 2)

        # AI insights (valeurs réelles calculables)
        recruitment_efficiency_score = round((applications_reviewed / total_applications_received) * 100, 1) if total_applications_received > 0 else 0.0
        cost_per_hire_reduction = 0  # non mesuré

        return {
            "company_id": f"company_{current_user['id']}",
            "profile": profile,
            "job_postings": {
                "total_active": total_active,
                "total_posted": total_posted,
                "avg_applications_per_job": avg_applications_per_job,
                "most_popular_positions": most_popular_positions
            },
            "recruitment_metrics": {
                "total_applications_received": total_applications_received,
                "applications_reviewed": applications_reviewed,
                "candidates_interviewed": candidates_interviewed,
                "hires_made": hires_made,
                "avg_time_to_hire": round(avg_time_to_hire, 1),
                "candidate_quality_score": candidate_quality_score
            },
            "ai_insights": {
                "top_skills_demanded": [],
                "candidate_match_accuracy": candidate_quality_score,
                "recruitment_efficiency_score": recruitment_efficiency_score,
                "cost_per_hire_reduction": cost_per_hire_reduction
            }
        }
    finally:
        cursor.close(); conn.close()

# Permissions: Seuls les recruteurs peuvent accéder aux statistiques
@router.get("/recruiter", response_model=dict)
async def recruiter_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Statistiques de base
        cursor.execute("SELECT COUNT(*) AS cnt FROM offres_emploi WHERE recruteur_id = %s AND statut = 'active'", (current_user["id"],))
        offers_publiees = int(cursor.fetchone()["cnt"])

        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM candidatures c JOIN offres_emploi o ON o.id = c.offre_emploi_id WHERE o.recruteur_id = %s",
            (current_user["id"],)
        )
        candidatures_recues = int(cursor.fetchone()["cnt"])

        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM candidatures c JOIN offres_emploi o ON o.id = c.offre_emploi_id WHERE o.recruteur_id = %s AND c.score_ia IS NOT NULL",
            (current_user["id"],)
        )
        analyses_cv = int(cursor.fetchone()["cnt"])

        cursor.execute(
            "SELECT AVG(c.score_ia) AS avg_score FROM candidatures c JOIN offres_emploi o ON o.id = c.offre_emploi_id WHERE o.recruteur_id = %s AND c.score_ia IS NOT NULL",
            (current_user["id"],)
        )
        row = cursor.fetchone()
        taux_compatibilite = float(row["avg_score"]) if row and row["avg_score"] is not None else 0.0

        # Nouvelles statistiques détaillées
        
        # Candidatures par statut
        cursor.execute("""
            SELECT c.statut, COUNT(*) as count 
            FROM candidatures c 
            JOIN offres_emploi o ON o.id = c.offre_emploi_id 
            WHERE o.recruteur_id = %s 
            GROUP BY c.statut
        """, (current_user["id"],))
        candidatures_par_statut = {row["statut"]: row["count"] for row in cursor.fetchall()}

        # Évolution des candidatures sur les 6 derniers mois
        cursor.execute("""
            SELECT 
                DATE_FORMAT(c.date_candidature, '%Y-%m') as mois,
                COUNT(*) as count
            FROM candidatures c 
            JOIN offres_emploi o ON o.id = c.offre_emploi_id 
            WHERE o.recruteur_id = %s 
            AND c.date_candidature >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(c.date_candidature, '%Y-%m')
            ORDER BY mois
        """, (current_user["id"],))
        evolution_candidatures = [{"mois": row["mois"], "count": row["count"]} for row in cursor.fetchall()]

        # Top 5 des offres les plus populaires
        cursor.execute("""
            SELECT 
                o.titre,
                COUNT(c.id) as nb_candidatures,
                AVG(c.score_ia) as score_moyen
            FROM offres_emploi o
            LEFT JOIN candidatures c ON c.offre_emploi_id = o.id
            WHERE o.recruteur_id = %s AND o.statut = 'active'
            GROUP BY o.id, o.titre
            ORDER BY nb_candidatures DESC
            LIMIT 5
        """, (current_user["id"],))
        top_offres = []
        for row in cursor.fetchall():
            top_offres.append({
                "titre": row["titre"],
                "nb_candidatures": row["nb_candidatures"] or 0,
                "score_moyen": round(float(row["score_moyen"]), 2) if row["score_moyen"] else 0
            })

        # Répartition des scores IA
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN c.score_ia >= 80 THEN 'Excellent (80-100)'
                    WHEN c.score_ia >= 60 THEN 'Bon (60-79)'
                    WHEN c.score_ia >= 40 THEN 'Moyen (40-59)'
                    ELSE 'Faible (0-39)'
                END as categorie,
                COUNT(*) as count
            FROM candidatures c 
            JOIN offres_emploi o ON o.id = c.offre_emploi_id 
            WHERE o.recruteur_id = %s AND c.score_ia IS NOT NULL
            GROUP BY categorie
        """, (current_user["id"],))
        repartition_scores = {row["categorie"]: row["count"] for row in cursor.fetchall()}

        # Temps moyen de traitement des candidatures
        cursor.execute("""
            SELECT AVG(DATEDIFF(NOW(), c.date_candidature)) as delai_moyen
            FROM candidatures c 
            JOIN offres_emploi o ON o.id = c.offre_emploi_id 
            WHERE o.recruteur_id = %s AND c.statut != 'en_attente'
        """, (current_user["id"],))
        row = cursor.fetchone()
        delai_moyen = float(row["delai_moyen"]) if row and row["delai_moyen"] else 0

        # Taux de conversion par étape
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN c.statut = 'examinee' THEN 1 ELSE 0 END) as examinees,
                SUM(CASE WHEN c.statut = 'preselectionnee' THEN 1 ELSE 0 END) as preselectionnees,
                SUM(CASE WHEN c.statut = 'acceptee' THEN 1 ELSE 0 END) as acceptees,
                COUNT(*) as total
            FROM candidatures c 
            JOIN offres_emploi o ON o.id = c.offre_emploi_id 
            WHERE o.recruteur_id = %s
        """, (current_user["id"],))
        row = cursor.fetchone()
        total = row["total"] if row["total"] > 0 else 1
        taux_conversion = {
            "examen": round((row["examinees"] / total) * 100, 1) if row["examinees"] else 0,
            "preselection": round((row["preselectionnees"] / total) * 100, 1) if row["preselectionnees"] else 0,
            "acceptation": round((row["acceptees"] / total) * 100, 1) if row["acceptees"] else 0
        }

        return {
            # Statistiques de base
            "offers_publiees": offers_publiees,
            "candidatures_recues": candidatures_recues,
            "analyses_cv": analyses_cv,
            "taux_compatibilite": round(taux_compatibilite, 2),
            
            # Nouvelles statistiques
            "candidatures_par_statut": candidatures_par_statut,
            "evolution_candidatures": evolution_candidatures,
            "top_offres": top_offres,
            "repartition_scores": repartition_scores,
            "delai_moyen_traitement": round(delai_moyen, 1),
            "taux_conversion": taux_conversion,
            
            # Métadonnées
            "date_generation": datetime.now().isoformat(),
            "periode_analyse": "6 derniers mois"
        }
    finally:
        cursor.close()
        conn.close()

@router.get("/recruiter/pdf-report")
async def generate_pdf_report(current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux recruteurs")

    # Récupérer les données statistiques
    stats_data = await recruiter_stats(current_user)
    
    # Créer le PDF en mémoire
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#374151')
    )
    
    # Contenu du PDF
    story = []
    
    # Titre
    story.append(Paragraph("Rapport Statistiques CVMatch", title_style))
    story.append(Spacer(1, 12))
    
    # Informations générales
    story.append(Paragraph("Informations Générales", heading_style))
    general_data = [
        ['Recruteur', f"{current_user.get('prenom', '')} {current_user.get('nom', '')}"],
        ['Email', current_user.get('email', '')],
        ['Date de génération', datetime.now().strftime('%d/%m/%Y à %H:%M')],
        ['Période d\'analyse', stats_data['periode_analyse']]
    ]
    
    general_table = Table(general_data, colWidths=[2*inch, 3*inch])
    general_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
    ]))
    story.append(general_table)
    story.append(Spacer(1, 20))
    
    # Statistiques principales
    story.append(Paragraph("Statistiques Principales", heading_style))
    main_stats = [
        ['Métrique', 'Valeur'],
        ['Offres publiées', str(stats_data['offers_publiees'])],
        ['Candidatures reçues', str(stats_data['candidatures_recues'])],
        ['Analyses CV effectuées', str(stats_data['analyses_cv'])],
        ['Taux de compatibilité moyen', f"{stats_data['taux_compatibilite']}%"],
        ['Délai moyen de traitement', f"{stats_data['delai_moyen_traitement']} jours"]
    ]
    
    main_table = Table(main_stats, colWidths=[2.5*inch, 2.5*inch])
    main_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('FONTSIZE', (0, 1), (-1, -1), 11)
    ]))
    story.append(main_table)
    story.append(Spacer(1, 20))
    
    # Taux de conversion
    story.append(Paragraph("Taux de Conversion", heading_style))
    conversion_data = [
        ['Étape', 'Taux'],
        ['Examen des candidatures', f"{stats_data['taux_conversion']['examen']}%"],
        ['Présélection', f"{stats_data['taux_conversion']['preselection']}%"],
        ['Acceptation', f"{stats_data['taux_conversion']['acceptation']}%"]
    ]
    
    conversion_table = Table(conversion_data, colWidths=[2.5*inch, 2.5*inch])
    conversion_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('FONTSIZE', (0, 1), (-1, -1), 11)
    ]))
    story.append(conversion_table)
    story.append(Spacer(1, 20))
    
    # Top des offres
    if stats_data['top_offres']:
        story.append(Paragraph("Top 5 des Offres les Plus Populaires", heading_style))
        top_offers_data = [['Titre de l\'offre', 'Candidatures', 'Score moyen']]
        for offer in stats_data['top_offres']:
            top_offers_data.append([
                offer['titre'][:40] + '...' if len(offer['titre']) > 40 else offer['titre'],
                str(offer['nb_candidatures']),
                f"{offer['score_moyen']}%"
            ])
        
        top_table = Table(top_offers_data, colWidths=[3*inch, 1*inch, 1*inch])
        top_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (0, -1), 'LEFT')
        ]))
        story.append(top_table)
    
    # Construire le PDF
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        io.BytesIO(buffer.read()),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rapport_statistiques_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"}
    )