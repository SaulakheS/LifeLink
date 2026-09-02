import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders shared header and footer on every route", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText(/Smart Healthcare Blood Management System/i)).toBeInTheDocument();
  });

  it("renders the select role page at the home route", () => {
    render(<App />);

    expect(screen.getByText(/Emergency Blood Donation Network/i)).toBeInTheDocument();
    expect(screen.getByText("Donor Login")).toBeInTheDocument();
    expect(screen.getByText("Hospital Login")).toBeInTheDocument();
  });

  it("renders header home link only", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: /donor dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /hospital dashboard/i })).not.toBeInTheDocument();
  });
});
