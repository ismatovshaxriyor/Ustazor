# ========================
# 🎨 JAZZMIN CONFIG — Ustazor App
# ========================

JAZZMIN_SETTINGS = {
    # --- Asosiy ma’lumotlar ---
    "site_title": "Ustazor Admin",
    "site_header": "Ustazor Management",
    "site_brand": "Ustazor App",
    "site_logo_classes": "img-circle shadow-sm",
    "welcome_sign": "Ustazor boshqaruv paneliga xush kelibsiz",
    "copyright": "© 2026 Ustazor App. All rights reserved.",
    "index_title": "Ustazor App boshqaruv paneli",

    # --- User avatar ---
    "user_avatar": None,

    # --- Sidebar menyu sozlamalari ---
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": ["sessions", "admin", "contenttypes", "token_blacklist"],
    "hide_models": [
        "auth.Group",
        "token_blacklist.OutstandingToken",
        "token_blacklist.BlacklistedToken",
    ],

    "icons": {
        "accounts": "fas fa-id-card",
        "accounts.CustomUser": "fas fa-user-gear",
        "accounts.customuser": "fas fa-user-gear",
        "accounts.WorkerProfile": "fas fa-hard-hat",
        "accounts.workerprofile": "fas fa-hard-hat",
        "accounts.WorkerSkill": "fas fa-tools",
        "accounts.workerskill": "fas fa-tools",
        "chat": "fas fa-comments",
        "chat.ChatThread": "fas fa-comments",
        "chat.chatthread": "fas fa-comments",
        "chat.ChatMessage": "fas fa-comment-dots",
        "chat.chatmessage": "fas fa-comment-dots",
        "common": "fas fa-layer-group",
        "jobs": "fas fa-briefcase",
        "jobs.JobOrder": "fas fa-clipboard-list",
        "jobs.joborder": "fas fa-clipboard-list",
        "proposals": "fas fa-file-signature",
        "proposals.VacancyProposal": "fas fa-paper-plane",
        "proposals.vacancyproposal": "fas fa-paper-plane",
        "reviews": "fas fa-star-half-alt",
        "reviews.WorkerReview": "fas fa-star",
        "reviews.workerreview": "fas fa-star",
        "reviews.WorkerReviewImage": "fas fa-image",
        "reviews.workerreviewimage": "fas fa-image",
        "reviews.WorkerPortfolio": "fas fa-briefcase",
        "reviews.workerportfolio": "fas fa-briefcase",
        "reviews.WorkerPortfolioImage": "fas fa-images",
        "reviews.workerportfolioimage": "fas fa-images",
        "users": "fas fa-users",
        "auth": "fas fa-user-lock",
        "token_blacklist": "fas fa-ban",
    },

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
