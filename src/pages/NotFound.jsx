import { Link } from "react-router-dom"
import Sidebar from "../components/Sidebar.jsx"

export default function NotFound() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="col">
        <div className="center-note">
          Такой страницы нет. <Link to="/">На главную</Link>
        </div>
      </div>
    </div>
  )
}
