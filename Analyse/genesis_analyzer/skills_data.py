"""
Référentiel de compétences multi-métiers (FR/EN).
Format : catégorie -> { "Nom canonique": [synonymes…] }.
Les synonymes servent à reconnaître une compétence quelle que soit sa formulation dans le CV
et à faire correspondre une exigence d'offre (« JS ») à sa forme canonique (« JavaScript »).
"""

TAXONOMY: dict[str, dict[str, list[str]]] = {
    "Langages de programmation": {
        "Python": ["python3", "py"], "Java": ["java se", "java ee", "j2ee", "jakarta ee"],
        "JavaScript": ["js", "ecmascript", "es6", "vanilla js"], "TypeScript": ["ts"],
        "C": ["langage c", "c ansi", "c99"], "C++": ["cpp", "c plus plus"], "C#": ["csharp", "c sharp"],
        "PHP": ["php7", "php8"], "Ruby": [], "Go": ["golang"], "Rust": [], "Kotlin": [], "Swift": [],
        "Objective-C": [], "Scala": [], "R": ["langage r", "r studio", "rstudio"], "MATLAB": [], "Perl": [],
        "Dart": [], "Lua": [], "Haskell": [], "Elixir": [], "Julia": [], "COBOL": [], "Fortran": [],
        "VBA": ["visual basic for applications", "macros excel"], "Visual Basic": ["vb.net", "vb6"],
        "Bash": ["shell", "shell script", "scripting shell", "zsh"], "PowerShell": [], "Assembleur": ["assembly", "asm"],
        "SQL": ["langage sql"], "PL/SQL": ["plsql"], "T-SQL": ["transact-sql", "tsql"], "Solidity": [],
    },
    "Web & frameworks": {
        "HTML": ["html5"], "CSS": ["css3"], "Sass": ["scss"], "Tailwind CSS": ["tailwind"], "Bootstrap": [],
        "React": ["react.js", "reactjs"], "Next.js": ["nextjs"], "Vue.js": ["vue", "vuejs", "nuxt", "nuxt.js"],
        "Angular": ["angularjs", "angular 2+"], "Svelte": ["sveltekit"], "jQuery": [], "Redux": [],
        "Node.js": ["node", "nodejs"], "Express": ["express.js", "expressjs"], "NestJS": ["nest.js"],
        "Django": [], "Flask": [], "FastAPI": [], "Spring": ["spring boot", "springboot", "spring framework"],
        "Hibernate": ["jpa"], "Laravel": [], "Symfony": [], "CodeIgniter": [], "Ruby on Rails": ["rails", "ror"],
        "ASP.NET": ["asp.net core", "asp .net"], ".NET": ["dotnet", ".net core", ".net framework"],
        "WordPress": ["wp"], "Drupal": [], "Joomla": [], "Shopify": [], "PrestaShop": [], "Magento": [],
        "GraphQL": [], "REST API": ["api rest", "restful", "rest", "api restful", "web services rest"],
        "SOAP": ["web services soap"], "WebSocket": ["websockets", "socket.io"], "Webpack": [], "Vite": [],
        "Three.js": [], "D3.js": ["d3"],
    },
    "Mobile": {
        "Android": ["android sdk", "android studio"], "iOS": ["swiftui", "uikit"], "Flutter": [],
        "React Native": [], "Ionic": [], "Xamarin": [],
    },
    "Données & IA": {
        "Machine Learning": ["apprentissage automatique", "ml", "apprentissage machine"],
        "Deep Learning": ["apprentissage profond", "reseaux de neurones", "neural networks"],
        "NLP": ["traitement du langage naturel", "natural language processing", "tal"],
        "Computer Vision": ["vision par ordinateur", "traitement d'images"],
        "IA générative": ["generative ai", "genai", "llm", "large language models", "chatgpt", "prompt engineering", "rag"],
        "TensorFlow": ["keras"], "PyTorch": [], "scikit-learn": ["sklearn", "scikit learn"],
        "Pandas": [], "NumPy": [], "Spark": ["apache spark", "pyspark"], "Hadoop": ["hdfs", "hive"],
        "Kafka": ["apache kafka"], "Airflow": ["apache airflow"], "dbt": [], "ETL": ["elt", "pipelines de donnees", "data pipeline"],
        "Data Science": ["science des donnees", "data scientist"], "Data Analysis": ["analyse de donnees", "data analyst", "analyse statistique"],
        "Statistiques": ["statistics", "statistique", "econometrie", "econometrics"],
        "Power BI": ["powerbi", "power bi desktop", "dax"], "Tableau": ["tableau software"], "Looker": ["looker studio", "google data studio"],
        "Qlik": ["qlikview", "qlik sense"], "Data Visualization": ["visualisation de donnees", "dataviz"],
        "Big Data": [], "Data Engineering": ["ingenierie des donnees", "data engineer"], "SAS": [], "SPSS": [], "Stata": [],
        "Hugging Face": ["transformers"], "OpenCV": [], "MLOps": ["mlflow"],
    },
    "Bases de données": {
        "PostgreSQL": ["postgres", "postgresql", "psql"], "MySQL": ["mariadb"], "Oracle Database": ["oracle", "oracle db", "oracle sql"],
        "SQL Server": ["mssql", "microsoft sql server"], "SQLite": [], "MongoDB": ["mongo"], "Redis": [],
        "Cassandra": [], "Elasticsearch": ["elastic", "elk", "opensearch"], "Firebase": ["firestore"],
        "Neo4j": [], "DynamoDB": [], "Snowflake": [], "BigQuery": ["google bigquery"], "Supabase": [],
        "Modélisation de données": ["merise", "uml", "mcd", "data modeling", "modelisation de bases de donnees"],
    },
    "Cloud & DevOps": {
        "AWS": ["amazon web services", "ec2", "s3", "lambda aws"], "Azure": ["microsoft azure"], "Google Cloud": ["gcp", "google cloud platform"],
        "Docker": ["conteneurisation", "containers", "docker compose"], "Kubernetes": ["k8s", "openshift", "helm"],
        "Terraform": ["infrastructure as code", "iac"], "Ansible": [], "Puppet": [], "Chef": [],
        "CI/CD": ["integration continue", "continuous integration", "deploiement continu", "continuous delivery"],
        "Jenkins": [], "GitLab CI": ["gitlab-ci"], "GitHub Actions": [], "Git": ["github", "gitlab", "bitbucket", "versioning", "svn"],
        "Linux": ["unix", "ubuntu", "debian", "centos", "red hat", "rhel"], "Windows Server": ["active directory", "ad ds"],
        "Nginx": [], "Apache": ["apache httpd"], "Prometheus": ["grafana"], "Microservices": ["architecture microservices"],
        "DevOps": [], "SRE": ["site reliability engineering"], "Virtualisation": ["vmware", "hyper-v", "virtualization", "proxmox"],
    },
    "Réseaux & sécurité": {
        "Réseaux": ["networking", "tcp/ip", "lan", "wan", "routage", "commutation", "vlan", "administration reseau"],
        "Cisco": ["ccna", "ccnp"], "Cybersécurité": ["cybersecurity", "securite informatique", "securite des systemes d'information", "ssi"],
        "Pentest": ["tests d'intrusion", "penetration testing", "ethical hacking"], "SOC": ["siem", "splunk", "qradar"],
        "ISO 27001": ["iso27001"], "RGPD": ["gdpr", "protection des donnees", "data protection"], "Firewall": ["pare-feu", "fortinet", "pfsense"],
        "Cryptographie": ["cryptography", "pki"], "Support informatique": ["helpdesk", "help desk", "support technique", "support utilisateurs", "assistance informatique"],
        "ITIL": [], "Téléphonie": ["voip", "toip", "telecom", "telecommunications"],
    },
    "Méthodes & gestion de projet": {
        "Gestion de projet": ["project management", "chef de projet", "pilotage de projet", "conduite de projet", "management de projet"],
        "Agile": ["methodes agiles", "agilite", "agile methodology"], "Scrum": ["scrum master", "sprint"], "Kanban": [],
        "SAFe": [], "PMP": ["pmi"], "Prince2": [], "Lean": ["lean management", "lean six sigma"], "Six Sigma": [],
        "Jira": ["confluence"], "Trello": [], "MS Project": ["microsoft project"], "Asana": [], "Notion": [],
        "Tests logiciels": ["qa", "assurance qualite logicielle", "tests unitaires", "unit testing", "tdd", "recette", "testing"],
        "Selenium": ["cypress", "playwright"], "UML": [], "Architecture logicielle": ["software architecture", "design patterns", "clean architecture"],
        "Conduite du changement": ["change management", "gestion du changement"], "Gestion des risques": ["risk management", "management des risques"],
        "Amélioration continue": ["continuous improvement", "kaizen", "pdca"],
    },
    "Bureautique & outils": {
        "Microsoft Office": ["ms office", "pack office", "suite office", "office 365", "microsoft 365"],
        "Excel": ["microsoft excel", "ms excel", "tableaux croises dynamiques", "excel avance"], "Word": ["microsoft word", "ms word"],
        "PowerPoint": ["microsoft powerpoint", "ms powerpoint"], "Outlook": [], "Google Workspace": ["google sheets", "google docs", "g suite"],
        "SharePoint": [], "Teams": ["microsoft teams"], "Access": ["microsoft access", "ms access"], "LibreOffice": ["openoffice"],
    },
    "Design & création": {
        "Figma": [], "Adobe XD": [], "Sketch": [], "Photoshop": ["adobe photoshop"], "Illustrator": ["adobe illustrator"],
        "InDesign": ["adobe indesign"], "Premiere Pro": ["adobe premiere"], "After Effects": [], "Canva": [], "Blender": [],
        "UX Design": ["ux", "experience utilisateur", "user experience", "ux research"], "UI Design": ["ui", "interface utilisateur", "user interface"],
        "Design graphique": ["graphic design", "infographie", "pao", "graphisme"], "Montage vidéo": ["video editing", "montage video"],
        "Photographie": ["photography"], "AutoCAD": ["autocad"], "SolidWorks": [], "Revit": [], "CATIA": [], "SketchUp": [], "ArchiCAD": [],
    },
    "Finance & comptabilité": {
        "Comptabilité générale": ["comptabilite", "accounting", "comptabilite generale", "tenue de comptabilite", "saisie comptable"],
        "Comptabilité analytique": ["cost accounting", "controle des couts", "comptabilite de gestion"],
        "Contrôle de gestion": ["management control", "controleur de gestion", "reporting financier", "budget", "budgetisation", "previsions budgetaires"],
        "Audit": ["audit financier", "audit interne", "internal audit", "commissariat aux comptes"],
        "Fiscalité": ["tax", "fiscalite", "declarations fiscales", "tva"], "Trésorerie": ["treasury", "gestion de tresorerie", "cash management"],
        "Analyse financière": ["financial analysis", "analyse financiere", "modelisation financiere", "financial modeling"],
        "Consolidation": ["consolidation des comptes"], "IFRS": ["ias/ifrs", "normes ifrs"], "OHADA": ["syscohada", "syscoa"],
        "Paie": ["payroll", "gestion de la paie", "paie et administration du personnel"], "SAP": ["sap fi", "sap co", "sap mm", "sap sd", "s/4hana"],
        "Sage": ["sage 100", "sage comptabilite", "sage paie"], "Odoo": [], "QuickBooks": [], "Cegid": [], "Recouvrement": ["credit management", "collection"],
        "Banque": ["banking", "operations bancaires"], "Assurance": ["insurance"], "Microfinance": [], "Gestion de patrimoine": ["wealth management"],
    },
    "Ressources humaines": {
        "Recrutement": ["recruitment", "talent acquisition", "sourcing", "chasse de tetes", "recrutement et selection"],
        "Gestion administrative du personnel": ["administration du personnel", "personnel administration", "adp", "gestion du personnel"],
        "Droit du travail": ["labor law", "employment law", "droit social", "legislation du travail"],
        "Formation professionnelle": ["training", "ingenierie de formation", "plan de formation", "learning and development"],
        "GPEC": ["gepp", "gestion previsionnelle des emplois et des competences", "workforce planning"],
        "Relations sociales": ["dialogue social", "relations sociales", "employee relations", "ire"],
        "SIRH": ["hris", "workday", "successfactors", "bamboohr"], "Onboarding": ["integration des collaborateurs"],
        "Gestion des talents": ["talent management", "entretiens annuels", "performance management"],
    },
    "Commercial & marketing": {
        "Vente": ["sales", "techniques de vente", "negociation commerciale", "prospection", "business development", "developpement commercial"],
        "Négociation": ["negotiation", "negociation"], "Relation client": ["customer relationship", "service client", "customer service", "relation clientele", "satisfaction client"],
        "CRM": ["salesforce", "hubspot", "zoho crm", "dynamics crm"], "Marketing digital": ["digital marketing", "webmarketing", "marketing numerique", "e-marketing"],
        "SEO": ["referencement naturel", "search engine optimization"], "SEA": ["google ads", "adwords", "referencement payant"],
        "Réseaux sociaux": ["social media", "community management", "community manager", "facebook ads", "meta ads", "linkedin ads"],
        "Marketing de contenu": ["content marketing", "redaction web", "copywriting", "brand content"], "Emailing": ["email marketing", "mailchimp", "sendinblue", "brevo"],
        "Google Analytics": ["ga4", "web analytics"], "Études de marché": ["market research", "etude de marche", "veille concurrentielle"],
        "Marketing stratégique": ["strategie marketing", "marketing strategy", "brand management", "gestion de marque"],
        "E-commerce": ["ecommerce", "commerce en ligne", "vente en ligne"], "Merchandising": ["visual merchandising"],
        "Key Account Management": ["grands comptes", "key accounts", "kam"], "Communication": ["communication corporate", "relations presse", "public relations", "communication interne"],
        "Événementiel": ["event management", "organisation d'evenements", "evenementiel"],
    },
    "Logistique & production": {
        "Logistique": ["logistics", "supply chain", "chaine logistique", "gestion logistique"], "Gestion des stocks": ["inventory management", "inventaire", "gestion de stock", "approvisionnement"],
        "Achats": ["purchasing", "procurement", "sourcing fournisseurs", "acheteur"], "Transport": ["freight", "transit", "fret", "transport et logistique"],
        "Douane": ["customs", "dedouanement", "declarant en douane"], "Import-export": ["commerce international", "international trade", "incoterms"],
        "Entreposage": ["warehousing", "gestion d'entrepot", "wms", "magasinage"], "Production": ["manufacturing", "gestion de production", "planification de production"],
        "Maintenance industrielle": ["maintenance", "gmao", "maintenance preventive", "maintenance corrective"],
        "Qualité": ["quality", "controle qualite", "assurance qualite", "quality assurance", "iso 9001", "qhse"],
        "HSE": ["hygiene securite environnement", "sst", "sante et securite au travail", "health and safety"],
        "Permis de conduire": ["permis b", "permis c", "driving licence", "driver's license", "permis poids lourd"], "Cariste": ["caces", "chariot elevateur", "forklift"],
    },
    "Ingénierie & BTP": {
        "Génie civil": ["civil engineering", "btp", "batiment", "travaux publics", "construction"], "Électricité": ["electricite", "electrical engineering", "electrotechnique", "habilitation electrique"],
        "Électronique": ["electronique", "electronics", "systemes embarques", "embedded systems", "arduino", "raspberry pi"],
        "Mécanique": ["mechanical engineering", "genie mecanique", "conception mecanique"], "Automatisme": ["automation", "plc", "automates programmables", "siemens step7", "scada"],
        "Topographie": ["surveying", "geometre"], "Énergies renouvelables": ["renewable energy", "solaire", "photovoltaique", "eolien"],
        "Pétrole et gaz": ["oil and gas", "petrole", "hydrocarbures", "upstream", "downstream"], "Mines": ["mining", "geologie", "geology"],
        "Hydraulique": ["hydraulics", "assainissement", "eau potable"], "Métré": ["quantity surveying", "devis quantitatif", "etude de prix"],
        "Conduite de travaux": ["site management", "chef de chantier", "suivi de chantier"], "SIG": ["gis", "arcgis", "qgis"],
    },
    "Santé & social": {
        "Soins infirmiers": ["nursing", "infirmier", "infirmiere", "soins"], "Premiers secours": ["first aid", "psc1", "sst secouriste"],
        "Pharmacie": ["pharmacy", "pharmacologie"], "Laboratoire": ["analyses medicales", "laboratory", "biologie medicale"],
        "Santé publique": ["public health", "epidemiologie", "epidemiology"], "Accompagnement social": ["travail social", "social work", "mediation sociale"],
        "Gestion hospitalière": ["hospital management", "administration hospitaliere"],
    },
    "Juridique & administration": {
        "Droit des affaires": ["business law", "droit commercial", "droit des societes", "corporate law"], "Contrats": ["redaction de contrats", "contract management", "gestion des contrats"],
        "Conformité": ["compliance", "lutte anti-blanchiment", "lcb-ft", "aml", "kyc"], "Secrétariat": ["secretariat", "assistanat", "assistant administratif", "office management"],
        "Gestion administrative": ["administration", "gestion administrative", "back office"], "Archivage": ["records management", "gestion documentaire", "ged"],
        "Accueil": ["reception", "standard telephonique", "accueil physique et telephonique"], "Marchés publics": ["public procurement", "appels d'offres", "passation de marches"],
    },
    "Hôtellerie, restauration & tourisme": {
        "Cuisine": ["cooking", "chef cuisinier", "commis de cuisine", "patisserie"], "Service en salle": ["serveur", "waiter", "service restauration"],
        "Hôtellerie": ["hospitality", "reception hoteliere", "front office hotel"], "Tourisme": ["tourism", "agence de voyage", "billetterie", "amadeus", "galileo"],
        "Hygiène alimentaire": ["haccp", "food safety"],
    },
    "Enseignement & recherche": {
        "Enseignement": ["teaching", "pedagogie", "formateur", "enseignant", "didactique"], "Recherche": ["research", "recherche scientifique", "publications scientifiques"],
        "Rédaction": ["writing", "redaction", "redaction technique", "technical writing"], "Traduction": ["translation", "traducteur", "interpretation"],
    },
    "Savoir-être": {
        "Leadership": ["meneur", "leader", "management d'equipe", "team management", "encadrement", "gestion d'equipe", "people management"],
        "Travail en équipe": ["teamwork", "esprit d'equipe", "team player", "collaboration"],
        "Communication orale": ["communication skills", "aisance relationnelle", "prise de parole", "public speaking", "excellent relationnel"],
        "Autonomie": ["autonomous", "independant", "self-starter"], "Rigueur": ["rigoureux", "rigoureuse", "attention to detail", "sens du detail", "minutie"],
        "Organisation": ["organisé", "organise", "organisee", "organizational skills", "sens de l'organisation", "gestion des priorites"],
        "Adaptabilité": ["adaptability", "flexibilite", "flexible", "polyvalence", "polyvalent", "capacite d'adaptation"],
        "Résolution de problèmes": ["problem solving", "resolution de problemes", "esprit d'analyse", "analytical skills", "esprit analytique"],
        "Créativité": ["creativity", "creatif", "creative", "innovation"], "Gestion du stress": ["stress management", "resistance au stress", "sang-froid"],
        "Sens du service": ["customer focus", "orientation client", "sens du client"], "Esprit critique": ["critical thinking"],
        "Gestion du temps": ["time management", "respect des delais", "ponctualite"], "Proactivité": ["proactive", "proactif", "force de proposition", "initiative"],
        "Intelligence émotionnelle": ["emotional intelligence", "empathie", "empathy", "ecoute active", "active listening"],
    },
}


def build_index() -> dict[str, dict]:
    """Index : alias normalisé -> {name, category}. Construit une seule fois au démarrage."""
    from .text_utils import norm
    index: dict[str, dict] = {}
    for category, skills in TAXONOMY.items():
        for name, aliases in skills.items():
            for alias in [name, *aliases]:
                key = norm(alias)
                # Le premier enregistré l'emporte (évite qu'un alias générique écrase un nom canonique).
                index.setdefault(key, {"name": name, "category": category})
    return index
