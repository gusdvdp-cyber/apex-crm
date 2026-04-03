export async function applyOrgTheme(primaryColor: string, secondaryColor: string, logoUrl?: string | null) {
  const root = document.documentElement;
  root.style.setProperty("--accent", primaryColor);
  root.style.setProperty("--accent-hover", primaryColor + "cc");
  root.style.setProperty("--accent-soft", primaryColor + "15");
  root.style.setProperty("--bg-main", secondaryColor);
  root.style.setProperty("--bg-card", secondaryColor === "#0a0a0a" ? "#111111" : "#ffffff");
  root.style.setProperty("--bg-sidebar", secondaryColor === "#0a0a0a" ? "#080808" : "#f5f5f5");
  root.style.setProperty("--brand-primary", primaryColor);
  root.style.setProperty("--brand-logo", logoUrl ? `url(${logoUrl})` : "none");
}