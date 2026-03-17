# ========================
# 🎨 JAZZMIN CONFIG — Ustazor App
# ========================

JAZZMIN_SETTINGS = {
    # --- Asosiy ma’lumotlar ---
    "site_title": "Ustazor Admin",
    "site_header": "Ustazor Management",
    "site_brand": "Ustazor App",
    "site_logo_classes": "img-circle shadow-sm",
    "welcome_sign": "Welcome to Ustazor Dashboard",
    "copyright": "© 2026 Ustazor App. All rights reserved.",
    "index_title": "Ustazor App boshqaruv paneli",

    # --- User avatar ---
    "user_avatar": None,

    # --- Sidebar menyu sozlamalari ---
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": ["sessions", "admin", "contenttypes"],
    "hide_models": ["auth.Group"],

    "default_icon_parents": "fas fa-folder",
    "default_icon_children": "fas fa-circle",

    "related_modal_active": False,

    # --- UI Tweaks ---
    "custom_css": None,
    "custom_js": None,
    "use_google_fonts_cdn": True,
    "show_ui_builder": True,

    # --- Forma tartibi ---
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "users.user": "collapsible",
        "todo.todo": "vertical_tabs",
    },

    # --- Tema (bootstrap varianti) ---
    "theme": "darkly",
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-primary",
    "accent": "accent-primary",
    "navbar": "navbar-secondary navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": False,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "lumen",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}