import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import FeaturesSection from "../components/FeaturesSection";
import HowItWorks from "../components/HowItWorks";
import Pricing from "../components/Pricing";
import Testimonials from "../components/Testimonials";
import CallToAction from "../components/CallToAction";
import Footer from "../components/Footer";


const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  const handleRedirect = (role: string) => {
    navigate("/login", { state: { role } });
  };

  // Animation d'apparition
  useEffect(() => {
    if (heroRef.current) {
      heroRef.current.style.opacity = "1";
      heroRef.current.style.transform = "translateY(0)";
    }
  }, []);

  return (
    <section id="accueil">
        <>
     <Navbar />
      <div style={styles.container}>
      <div style={styles.contentWrapper}>
        <div ref={heroRef} style={styles.hero}>
          <h1 style={styles.title}>
            L'analyse de CV, <span style={styles.accent}>simplifiée</span>
          </h1>
          <p style={styles.subtitle}>
            Notre application intelligente analyse automatiquement les CV et les met en relation avec les offres d'emploi pertinentes.
          </p>
          <div style={styles.buttons}>
            <button
              style={styles.primaryButton}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.07)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              onClick={() => handleRedirect("recruiter")}
            >
              Je suis recruteur
            </button>
            <button
              style={styles.secondaryButton}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.07)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              onClick={() => handleRedirect("candidate")}
            >
              Je suis candidat
            </button>
          </div>
        </div>
        <div style={styles.imageWrapper}>
         <img
             src="/lOUmIlkgenyBYrqEKqUnUYvs8g.avif"
             alt="Illustration CV"
             style={styles.animatedImage}
    />
        </div>
      </div>
    </div>

        <FeaturesSection />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CallToAction />
        <br /> <br />
        <Footer />
    </>
    
    </section>
    
  );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #768fffff 0%, #1f5bf4ff 100%)",
    color: "#fff",
    padding: "0",
  },
  contentWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "1200px",
    gap: "3rem",
    flexWrap: "wrap",
  },
  hero: {
    flex: 1,
    minWidth: "320px",
    maxWidth: "600px",
    textAlign: "left",
    margin: "0 auto",
    opacity: 0,
    transform: "translateY(40px)",
    transition: "opacity 1s cubic-bezier(.4,0,.2,1), transform 1s cubic-bezier(.4,0,.2,1)",
  },
  
  imageWrapper: {
    flex: 1,
    minWidth: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "5rem",
  },
  title: {
    fontSize: "clamp(2rem, 5vw, 3rem)",
    fontWeight: 800,
    marginBottom: "1.5rem",
    lineHeight: 1.1,
    marginLeft: "2.4rem",
  },
  accent: {
    color: "#fff",
    fontWeight: 900,
    textShadow: "0 2px 16px #0030a0",
  },
  subtitle: {
    fontSize: "1.3rem",
    lineHeight: "1.6",
    marginBottom: "3rem",
    color: "#e0e7ff",
    fontWeight: 400,
    marginLeft: "2.4rem",
  },
  buttons: {
    display: "flex",
    justifyContent: "center",
    gap: "2rem",
    flexWrap: "wrap",
    marginTop: "2rem",
  },
  primaryButton: {
    backgroundColor: "#fff",
    color: "#0047ff",
    padding: "1rem 2.5rem",
    fontSize: "1.2rem",
    fontWeight: 700,
    borderRadius: "0.8rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "background 0.2s, color 0.2s, transform 0.2s",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    color: "#fff",
    border: "2px solid #fff",
    padding: "1rem 2.5rem",
    fontSize: "1.2rem",
    fontWeight: 700,
    borderRadius: "0.8rem",
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s, transform 0.2s",
  },
 animatedImage: {
    width: "500px",
    height: "500px", 
    objectFit: "contain",
    borderRadius: "1.5rem",
    animation: "float 2.5s ease-in-out infinite", // animation ajoutée
  },
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
@keyframes float {
  0% { transform: translateY(0);}
  50% { transform: translateY(-24px);}
  100% { transform: translateY(0);}
}
`;
document.head.appendChild(styleSheet);

export default Home;