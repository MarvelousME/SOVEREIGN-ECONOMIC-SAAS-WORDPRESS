/**
 * UBI CMS Main JavaScript
 * 
 * @package UBI_CMS
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Prevent XSS via textContent
    function safeText(el, text) {
        if (el) el.textContent = text;
    }

    // UBI Dashboard
    function initUbiDashboard() {
        var dashboards = document.querySelectorAll('.ubi-dashboard');
        if (!dashboards.length) return;

        var data = window.ubiCmsData;
        if (!data || !data.ajaxUrl) return;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', data.ajaxUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.setRequestHeader('X-WP-Nonce', data.nonce);

        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        var total = document.getElementById('ubi-total-earnings');
                        var balance = document.getElementById('ubi-balance');
                        var rep = document.getElementById('ubi-reputation');

                        if (total) total.textContent = '$' + response.data.total_earnings.toFixed(2);
                        if (balance) balance.textContent = '$' + response.data.ubi_balance.toFixed(2);
                        if (rep) rep.textContent = response.data.reputation_score;
                    }
                } catch (e) {
                    console.error('Dashboard parse error:', e);
                }
            }
        };

        xhr.onerror = function() {
            console.error('Dashboard network error');
        };

        xhr.send('action=ubi_get_dashboard_data&nonce=' + data.nonce);
    }

    // Login form handling
    function initLoginForm() {
        var form = document.getElementById('ubi-login-form');
        if (!form) return;

        form.addEventListener('submit', function(e) {
            var nonceField = form.querySelector('[name="ubi_login_nonce"]');
            if (!nonceField || !nonceField.value) {
                e.preventDefault();
                alert('Security validation failed');
            }
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initUbiDashboard();
            initLoginForm();
        });
    } else {
        initUbiDashboard();
        initLoginForm();
    }

})();
