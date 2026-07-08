import { redirect } from "next/navigation";
// import Navbar from "./components/Navbar";
// import HeroSection from "./components/HeroSection";
// import FeaturesSection from "./components/FeaturesSection";
// import HowItWorks from "./components/HowItWorks";
// import Footer from "./components/Footer";

export default function Home() {
  redirect("/login");

  /*
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
  */
}

