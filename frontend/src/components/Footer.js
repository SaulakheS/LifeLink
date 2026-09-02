import "./Footer.css";

export default function Footer() {
  return (
    <footer className="ll-footer">
      <div className="ll-footer-grid">
        <div>
          <h2>LifeLink</h2>
          <p>
            Connecting blood donors, hospitals, and emergency healthcare
            systems through a secure and responsive digital platform.
          </p>
        </div>

        <div>
          <h3>Blood Awareness</h3>

          <ul>
            <li>One donation can save up to 3 lives</li>
            <li>Healthy adults can donate every 3 months</li>
            <li>Emergency blood shortages happen daily</li>
          </ul>
        </div>

        <div>
          <h3>Emergency Support</h3>

          <ul>
            <li>24/7 SOS Blood Requests</li>
            <li>Fast Hospital Connectivity</li>
            <li>Live Donor Availability</li>
          </ul>
        </div>
      </div>

      <div className="ll-footer-bottom">
        © 2026 LifeLink • Emergency Blood Network System
      </div>
    </footer>
  );
}