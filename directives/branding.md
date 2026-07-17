# Branding Configuration

This directive defines rules for branding and localization configurations.

## Rules
- Logo urls, primary/secondary hex color codes, and footer texts must be injected dynamically via `BrandingConfiguration`.
- Never hardcode branding parameters inside builder classes.
- Locale configurations (locales, date formats, timezones) must be handled by section builders using `LocalizationConfiguration` and `CompositionContext`.
