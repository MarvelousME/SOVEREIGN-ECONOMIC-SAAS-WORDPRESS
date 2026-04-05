jQuery(document).ready(function($) {
    $('.saaos-keycloak-login-btn, .saaos-keycloak-register-btn').on('click', function() {
        $(this).append(' <span class="spinner"></span>');
        $('.spinner').css({
            'display': 'inline-block',
            'width': '16px',
            'height': '16px',
            'border': '2px solid #fff',
            'border-top-color': 'transparent',
            'border-radius': '50%',
            'animation': 'saaos-spin 0.8s linear infinite'
        });
    });

    $('<style>@keyframes saaos-spin { to { transform: rotate(360deg); } }</style>').appendTo('head');
});