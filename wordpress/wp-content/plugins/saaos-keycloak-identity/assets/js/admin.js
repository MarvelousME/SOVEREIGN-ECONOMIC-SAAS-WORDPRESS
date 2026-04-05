jQuery(document).ready(function($) {
    $('#saaos-keycloak-test-connection').on('click', function() {
        var $button = $(this);
        var $result = $('#saaos-keycloak-test-result');
        
        $button.prop('disabled', true).text('Testing...');
        $result.removeClass('success error').html('');

        $.ajax({
            url: saaosKeycloakAdmin.ajaxUrl,
            type: 'POST',
            data: {
                action: 'saaos_keycloak_test_connection',
                nonce: saaosKeycloakAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    $result.addClass('success').html(
                        '<div class="notice notice-success"><p>' + 
                        saaosKeycloakAdmin.strings.success + ' ' + response.data.message + 
                        '</p></div>'
                    );
                } else {
                    $result.addClass('error').html(
                        '<div class="notice notice-error"><p>' + 
                        saaosKeycloakAdmin.strings.failed + ': ' + (response.data.message || 'Unknown error') + 
                        '</p></div>'
                    );
                }
            },
            error: function() {
                $result.addClass('error').html(
                    '<div class="notice notice-error"><p>' + 
                    saaosKeycloakAdmin.strings.failed + ': AJAX error' + 
                    '</p></div>'
                );
            },
            complete: function() {
                $button.prop('disabled', false).text(saaosKeycloakAdmin.strings.testConnection);
            }
        });
    });

    $('#saaos-keycloak-clear-cache').on('click', function() {
        var $button = $(this);
        var $result = $('#saaos-keycloak-test-result');
        
        $button.prop('disabled', true).text('Clearing...');

        $.ajax({
            url: saaosKeycloakAdmin.ajaxUrl,
            type: 'POST',
            data: {
                action: 'saaos_keycloak_clear_cache',
                nonce: saaosKeycloakAdmin.nonce
            },
            success: function(response) {
                $result.removeClass('error').addClass('success').html(
                    '<div class="notice notice-success"><p>' + 
                    saaosKeycloakAdmin.strings.cacheCleared + 
                    '</p></div>'
                );
            },
            error: function() {
                $result.addClass('error').html(
                    '<div class="notice notice-error"><p>Cache clear failed</p></div>'
                );
            },
            complete: function() {
                $button.prop('disabled', false).text(saaosKeycloakAdmin.strings.clearCache);
            }
        });
    });
});