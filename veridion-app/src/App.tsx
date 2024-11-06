import "./App.css";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import { ProblemsAndSolutions } from "./components/ProblemsAndSolutions";
import { ScrollToTop } from "./components/ScrollToTop";
import { TechStack } from "./components/TechStack";
import { TryIt } from "./components/TryIt";
import { WhatCanItDo } from "./components/WhatCanItDo";
import { WhatIsThis } from "./components/WhatIsThis";

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <WhatIsThis />
      <TechStack />
      <WhatCanItDo />
      <ProblemsAndSolutions />
      <TryIt />
      <ScrollToTop />
    </>
  );
}

export default App;
