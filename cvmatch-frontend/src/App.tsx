import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from './pages/Dashboard';
import CreateOffer from "./pages/CreateOffer";
import CandidateHome from "./pages/CandidateHome";
import AnalyseCV from "./pages/AnalyseCV";
import Offres from "./pages/Offres";
import ChatIA from "./pages/ChatIA";
import JobOffers from "./pages/JobOffers";
import AnalysisOffers from "./pages/AnalysisOffers";
import OfferCandidates from "./pages/OfferCandidates";
import AnalysisLoading from "./pages/AnalysisLoading";
import AnalysisResults from "./pages/AnalysisResults";
import History from "./pages/History";
import CompanySetup from "./pages/CompanySetup";
import Notifications from "./pages/Notifications";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-offer" element={<CreateOffer />} />
        <Route path="/candidate-home" element={<CandidateHome />} />
        <Route path="/analyse-cv" element={<AnalyseCV />} />
        <Route path="/offres" element={<Offres />} />
        <Route path="/chat-ia" element={<ChatIA />} />
        <Route path="/job-offers" element={<JobOffers />} />
        <Route path="/analysis-offers" element={<AnalysisOffers />} />
        <Route path="/analysis-offers/:offerId" element={<OfferCandidates />} />
        <Route path="/analysis-loading/:offerId" element={<AnalysisLoading />} />
        <Route path="/analysis-results/:offerId" element={<AnalysisResults />} />
        <Route path="/history" element={<History />} />
        <Route path="/company-setup" element={<CompanySetup />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </Router>
  );
}

export default App;
