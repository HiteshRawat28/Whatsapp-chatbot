# Design Guidelines

## Aesthetic & UX Rules
- **Framework:** The frontend uses React (via Vite).
- **Styling:** The project utilizes vanilla CSS or standard CSS-in-JS. Unless tailwind is explicitly initialized, stick to the project's CSS strategy.
- **Icons:** Use `lucide-react` for all UI icons to maintain a clean, modern aesthetic.
- **Tone:** The dashboard is a professional tool for customer support agents. UI should be clean, high-contrast, and focused on readability.

## Component Structure
- Keep components modular.
- The dashboard should prominently display active conversations, clearly differentiate between bot-handled vs. human-requested chats, and clearly indicate when the 24-hour service window has expired for a user.
