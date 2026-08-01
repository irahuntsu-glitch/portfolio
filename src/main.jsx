import React, { Suspense, lazy } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"

import "./styles.css"
import ScrollToTop from "./components/ScrollToTop.jsx"
import Home from "./pages/Home.jsx"
import CasePage from "./pages/CasePage.jsx"
import NotFound from "./pages/NotFound.jsx"

// The admin is only ever opened by the owner — keep it out of the main bundle.
const Admin = lazy(() => import("./admin/Admin.jsx"))

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <Suspense fallback={<div className="center-note">Загрузка…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/case/:slug" element={<CasePage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
)
