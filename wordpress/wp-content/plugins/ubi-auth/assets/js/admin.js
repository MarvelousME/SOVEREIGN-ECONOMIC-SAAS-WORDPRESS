/**
 * UBI Auth Admin JavaScript
 * Version: 1.0.4
 */

(function($) {
    'use strict';

    // Initialize when document is ready
    $(document).ready(function() {
        initGenerateKeyForm();
        initRevokeButtons();
        initModals();
    });

    /**
     * Initialize the generate key form
     */
    function initGenerateKeyForm() {
        var $form = $('#ubi-generate-key-form');
        var $btn = $('#ubi-generate-btn');
        var $modal = $('#ubi-new-key-modal');

        if (!$form.length) return;

        $form.on('submit', function(e) {
            e.preventDefault();

            var name = $('#ubi-key-name').val().trim();
            var userId = $('#ubi-key-user').val();

            if (!name) {
                alert('Please enter a key name.');
                return;
            }

            if (!userId) {
                alert('Please select a user.');
                return;
            }

            // Show loading state
            $btn.prop('disabled', true).addClass('ubi-loading').text('Generating...');

            $.ajax({
                url: ubiAuth.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'ubi_generate_api_key',
                    nonce: ubiAuth.nonce,
                    name: name,
                    user_id: userId
                },
                success: function(response) {
                    if (response.success) {
                        // Show the new key modal
                        $('#ubi-new-key-value').text(response.data.key);
                        $('#ubi-new-key-name').text(response.data.name);
                        $('#ubi-new-key-prefix').text(response.data.key_prefix);
                        
                        // Store the key in the copy button for reference
                        $('.ubi-copy-btn').data('key', response.data.key);
                        
                        $modal.show();
                        
                        // Reset form
                        $form[0].reset();
                        
                        // Refresh the keys table after a delay
                        setTimeout(function() {
                            location.reload();
                        }, 3000);
                    } else {
                        alert(response.data.message || ubiAuth.strings.error);
                    }
                },
                error: function() {
                    alert(ubiAuth.strings.error);
                },
                complete: function() {
                    $btn.prop('disabled', false).removeClass('ubi-loading').text('Generate API Key');
                }
            });
        });
    }

    /**
     * Initialize revoke buttons
     */
    function initRevokeButtons() {
        var $modal = $('#ubi-revoke-modal');

        // Open revoke modal
        $(document).on('click', '.ubi-revoke-btn', function(e) {
            e.preventDefault();
            var keyId = $(this).data('key-id');
            var keyName = $(this).data('key-name');
            
            $('#ubi-revoke-key-id').val(keyId);
            $('#ubi-revoke-key-name').text(keyName);
            $modal.show();
        });

        // Close modal on cancel
        $('.ubi-cancel-revoke-btn').on('click', function() {
            $modal.hide();
        });

        // Submit revoke form
        $('#ubi-revoke-key-form').on('submit', function(e) {
            e.preventDefault();
            
            var keyId = $('#ubi-revoke-key-id').val();
            var $btn = $('.ubi-confirm-revoke-btn');
            
            $btn.prop('disabled', true).addClass('ubi-loading').text('Revoking...');
            
            $.ajax({
                url: ubiAuth.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'ubi_revoke_api_key',
                    nonce: ubiAuth.nonce,
                    key_id: keyId
                },
                success: function(response) {
                    if (response.success) {
                        $modal.hide();
                        
                        // Update the row status without reload
                        var $row = $('tr[data-key-id="' + keyId + '"]');
                        if ($row.length) {
                            $row.find('.column-status').html('<span class="ubi-status ubi-status-revoked">Revoked</span>');
                            $row.find('.column-actions').html('<span class="ubi-revoked-label">Revoked</span>');
                        }
                        
                        // Show success notice
                        showNotice('success', ubiAuth.strings.keyRevoked);
                    } else {
                        alert(response.data.message || ubiAuth.strings.error);
                    }
                },
                error: function() {
                    alert(ubiAuth.strings.error);
                },
                complete: function() {
                    $btn.prop('disabled', false).removeClass('ubi-loading').text('Yes, Revoke Key');
                }
            });
        });
    }

    /**
     * Initialize modal close functionality
     */
    function initModals() {
        // Close modal on X click
        $(document).on('click', '.ubi-modal-close', function() {
            $(this).closest('.ubi-modal').hide();
        });

        // Close modal on background click
        $(document).on('click', '.ubi-modal', function(e) {
            if (e.target === this) {
                $(this).hide();
            }
        });

        // Close modal on Escape key
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape') {
                $('.ubi-modal:visible').hide();
            }
        });
    }

    /**
     * Copy to clipboard functionality
     */
    $(document).on('click', '.ubi-copy-btn', function() {
        var $btn = $(this);
        var key = $btn.data('key');
        
        if (!key) {
            var $codeEl = $btn.closest('.ubi-key-display').find('code');
            key = $codeEl.text();
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(key).then(function() {
                showCopySuccess($btn);
            }).catch(function() {
                fallbackCopy(key, $btn);
            });
        } else {
            fallbackCopy(key, $btn);
        }
    });

    /**
     * Fallback copy method for older browsers
     */
    function fallbackCopy(text, $btn) {
        var $temp = $('<textarea>');
        $('body').append($temp);
        $temp.val(text).select();
        
        try {
            document.execCommand('copy');
            showCopySuccess($btn);
        } catch (err) {
            alert('Copy failed. Please copy manually.');
        }
        
        $temp.remove();
    }

    /**
     * Show copy success feedback
     */
    function showCopySuccess($btn) {
        var originalText = $btn.text();
        $btn.addClass('clicked').text('Copied!');
        
        setTimeout(function() {
            $btn.removeClass('clicked').text(originalText);
        }, 2000);
    }

    /**
     * Show a notice message
     */
    function showNotice(type, message) {
        var $notice = $('<div class="ubi-notice ubi-notice-' + type + '">' + message + '</div>');
        
        $('.ubi-api-keys-wrap').prepend($notice);
        
        setTimeout(function() {
            $notice.fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
    }

})(jQuery);
