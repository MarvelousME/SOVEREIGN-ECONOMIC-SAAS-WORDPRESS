<?php
/**
 * Plugin Name: Sovereign Digital Twin
 * Description: User digital-twin images, optional map location, global member globe (topographic map), and front-page member strip — styled for Nexros + Sovereign child theme.
 * Version: 1.0.0
 * Author: Sovereign OS
 * Text Domain: sovereign-digital-twin
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SOV_DT_VERSION', '1.0.0');
define('SOV_DT_PATH', plugin_dir_path(__FILE__));
define('SOV_DT_URL', plugin_dir_url(__FILE__));

final class Sovereign_Digital_Twin {
    private const META_TWIN_ATTACHMENT = 'sov_digital_twin_attachment_id';
    private const META_MAP_LAT = 'sov_map_lat';
    private const META_MAP_LNG = 'sov_map_lng';
    private const META_MAP_PUBLIC = 'sov_map_public';
    private const META_MAP_CITY = 'sov_map_city';

    private static ?self $instance = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', [$this, 'register_user_meta']);
        add_action('rest_api_init', [$this, 'register_rest']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('show_user_profile', [$this, 'profile_fields']);
        add_action('edit_user_profile', [$this, 'profile_fields']);
        add_action('personal_options_update', [$this, 'save_profile_fields']);
        add_action('edit_user_profile_update', [$this, 'save_profile_fields']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_front']);
        add_shortcode('sovereign_member_globe', [$this, 'shortcode_globe']);
        add_shortcode('sovereign_front_member_strip', [$this, 'shortcode_strip']);
        add_shortcode('sovereign_digital_twin_settings', [$this, 'shortcode_settings']);
        add_filter('the_content', [$this, 'maybe_prepend_strip'], 1);
    }

    public function register_user_meta(): void {
        $string_args = [
            'type' => 'string',
            'single' => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback' => [$this, 'meta_auth_own_or_edit'],
        ];
        register_meta('user', self::META_MAP_CITY, $string_args);

        register_meta('user', self::META_MAP_LAT, [
            'type' => 'string',
            'single' => true,
            'sanitize_callback' => [$this, 'sanitize_coordinate'],
            'auth_callback' => [$this, 'meta_auth_own_or_edit'],
        ]);
        register_meta('user', self::META_MAP_LNG, [
            'type' => 'string',
            'single' => true,
            'sanitize_callback' => [$this, 'sanitize_coordinate'],
            'auth_callback' => [$this, 'meta_auth_own_or_edit'],
        ]);
        register_meta('user', self::META_MAP_PUBLIC, [
            'type' => 'boolean',
            'single' => true,
            'sanitize_callback' => [$this, 'sanitize_bool_meta'],
            'auth_callback' => [$this, 'meta_auth_own_or_edit'],
        ]);
        register_meta('user', self::META_TWIN_ATTACHMENT, [
            'type' => 'integer',
            'single' => true,
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'meta_auth_own_or_edit'],
        ]);
    }

    public function meta_auth_own_or_edit(): bool {
        return is_user_logged_in();
    }

    public function sanitize_coordinate($value): string {
        $f = is_numeric($value) ? (float) $value : 0.0;
        return (string) round($f, 6);
    }

    public function sanitize_bool_meta($value): bool {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public function register_settings(): void {
        register_setting('sov_digital_twin', 'sov_dt_prepend_front', [
            'type' => 'string',
            'default' => '0',
            'sanitize_callback' => static function ($v) {
                return ($v === '1' || $v === 1 || $v === true) ? '1' : '0';
            },
        ]);
        register_setting('sov_digital_twin', 'sov_dt_strip_limit', [
            'type' => 'integer',
            'default' => 32,
            'sanitize_callback' => static function ($v) {
                $n = (int) $v;
                return max(4, min(80, $n));
            },
        ]);
    }

    public function admin_menu(): void {
        add_options_page(
            __('Digital Twin', 'sovereign-digital-twin'),
            __('Digital Twin', 'sovereign-digital-twin'),
            'manage_options',
            'sov-digital-twin',
            [$this, 'render_admin']
        );
    }

    public function render_admin(): void {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Sovereign Digital Twin', 'sovereign-digital-twin'); ?></h1>
            <form method="post" action="options.php">
                <?php settings_fields('sov_digital_twin'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Member strip on front page', 'sovereign-digital-twin'); ?></th>
                        <td>
                            <input type="hidden" name="sov_dt_prepend_front" value="0" />
                            <label>
                                <input type="checkbox" name="sov_dt_prepend_front" value="1" <?php checked(get_option('sov_dt_prepend_front', '0'), '1'); ?> />
                                <?php esc_html_e('Prepend the horizontal member strip to the main front page content (static front page only).', 'sovereign-digital-twin'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Strip member limit', 'sovereign-digital-twin'); ?></th>
                        <td>
                            <input type="number" name="sov_dt_strip_limit" value="<?php echo esc_attr((string) get_option('sov_dt_strip_limit', 32)); ?>" min="4" max="80" />
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <p><?php esc_html_e('Shortcodes:', 'sovereign-digital-twin'); ?>
                <code>[sovereign_member_globe]</code>,
                <code>[sovereign_front_member_strip]</code>,
                <code>[sovereign_digital_twin_settings]</code>
            </p>
            <p><?php esc_html_e('Assign the page template “Sovereign — Member globe & digital twins” in Nexros Child for a full-width globe page.', 'sovereign-digital-twin'); ?></p>
        </div>
        <?php
    }

    public static function resolve_display_image_url(int $user_id): string {
        $aid = (int) get_user_meta($user_id, self::META_TWIN_ATTACHMENT, true);
        if ($aid > 0) {
            $url = wp_get_attachment_image_url($aid, 'medium');
            if ($url) {
                return $url;
            }
        }
        $avatar = get_avatar_url($user_id, ['size' => 256]);
        return $avatar ?: '';
    }

    public static function placeholder_url(): string {
        return SOV_DT_URL . 'assets/placeholder-digital-twin.svg';
    }

    public static function resolve_image_or_placeholder(int $user_id): string {
        $u = self::resolve_display_image_url($user_id);
        return $u !== '' ? $u : self::placeholder_url();
    }

    public function register_rest(): void {
        register_rest_route('sovereign-digital-twin/v1', '/map-markers', [
            'methods' => 'GET',
            'permission_callback' => '__return_true',
            'callback' => [$this, 'rest_map_markers'],
        ]);
    }

    public function rest_map_markers(WP_REST_Request $req): WP_REST_Response {
        $user_ids = get_users([
            'fields' => 'ID',
            'number' => 500,
        ]);
        $out = [];
        foreach ($user_ids as $uid) {
            $uid = (int) $uid;
            if (!user_can($uid, 'read')) {
                continue;
            }
            $pub = get_user_meta($uid, self::META_MAP_PUBLIC, true);
            if (!$pub) {
                continue;
            }
            $lat = get_user_meta($uid, self::META_MAP_LAT, true);
            $lng = get_user_meta($uid, self::META_MAP_LNG, true);
            if ($lat === '' || $lng === '' || !is_numeric($lat) || !is_numeric($lng)) {
                continue;
            }
            $user = get_userdata($uid);
            if (!$user) {
                continue;
            }
            $out[] = [
                'id' => $uid,
                'label' => $user->display_name ?: $user->user_login,
                'city' => (string) get_user_meta($uid, self::META_MAP_CITY, true),
                'lat' => (float) $lat,
                'lng' => (float) $lng,
                'image' => esc_url_raw(self::resolve_image_or_placeholder($uid)),
            ];
        }
        return new WP_REST_Response($out, 200);
    }

    public function enqueue_front(): void {
        global $post;
        $need_leaflet = false;
        if ($post instanceof WP_Post) {
            if (has_shortcode($post->post_content, 'sovereign_member_globe')) {
                $need_leaflet = true;
            }
        }
        if (is_page_template('page-templates/template-sovereign-member-globe.php')) {
            $need_leaflet = true;
        }

        if ($need_leaflet) {
            wp_enqueue_style(
                'sov-dt-leaflet',
                'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
                [],
                '1.9.4'
            );
            wp_enqueue_script(
                'sov-dt-leaflet',
                'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
                [],
                '1.9.4',
                true
            );
            wp_enqueue_script(
                'sov-dt-globe',
                SOV_DT_URL . 'assets/sovereign-dt-globe.js',
                ['sov-dt-leaflet'],
                SOV_DT_VERSION,
                true
            );
            wp_localize_script('sov-dt-globe', 'sovDigitalTwin', [
                'restMarkers' => rest_url('sovereign-digital-twin/v1/map-markers'),
            ]);
        }

        if (
            (is_front_page() && get_option('sov_dt_prepend_front', '0') === '1') ||
            ($post instanceof WP_Post && has_shortcode($post->post_content, 'sovereign_front_member_strip')) ||
            ($post instanceof WP_Post && has_shortcode($post->post_content, 'sovereign_digital_twin_settings')) ||
            ($post instanceof WP_Post && has_shortcode($post->post_content, 'sovereign_member_globe'))
        ) {
            wp_enqueue_style('sov-dt', SOV_DT_URL . 'assets/sovereign-digital-twin.css', [], SOV_DT_VERSION);
        }
    }

    public function shortcode_globe($atts): string {
        wp_enqueue_style(
            'sov-dt-leaflet',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            [],
            '1.9.4'
        );
        wp_enqueue_script(
            'sov-dt-leaflet',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            [],
            '1.9.4',
            true
        );
        wp_enqueue_script(
            'sov-dt-globe',
            SOV_DT_URL . 'assets/sovereign-dt-globe.js',
            ['sov-dt-leaflet'],
            SOV_DT_VERSION,
            true
        );
        wp_localize_script('sov-dt-globe', 'sovDigitalTwin', [
            'restMarkers' => rest_url('sovereign-digital-twin/v1/map-markers'),
        ]);
        wp_enqueue_style('sov-dt', SOV_DT_URL . 'assets/sovereign-digital-twin.css', [], SOV_DT_VERSION);

        $a = shortcode_atts([
            'height' => '520px',
            'title' => __('Member globe', 'sovereign-digital-twin'),
        ], $atts, 'sovereign_member_globe');

        $h = preg_match('/^\d+(px|vh|%)$/', $a['height']) ? $a['height'] : '520px';

        ob_start();
        ?>
        <section class="sov-dt-globe-wrap nexros-sovereign-card" aria-label="<?php echo esc_attr($a['title']); ?>">
            <header class="sov-dt-globe-header">
                <h2 class="sov-dt-globe-title nexros-sovereign-title"><?php echo esc_html($a['title']); ?></h2>
                <p class="sov-dt-globe-sub nexros-sovereign-subtitle">
                    <?php esc_html_e('Topographic basemap. Markers show members who enabled “visible on map” and set coordinates.', 'sovereign-digital-twin'); ?>
                </p>
            </header>
            <div id="sov-dt-map" class="sov-dt-map" style="height:<?php echo esc_attr($h); ?>;" role="img" aria-label="<?php esc_attr_e('Interactive map of members', 'sovereign-digital-twin'); ?>"></div>
            <p class="sov-dt-map-attribution">
                <a href="https://opentopomap.org/" rel="noopener noreferrer" target="_blank">OpenTopoMap</a>
                (<a href="https://creativecommons.org/licenses/by-sa/3.0/" rel="noopener noreferrer" target="_blank">CC-BY-SA</a>)
            </p>
        </section>
        <?php
        return (string) ob_get_clean();
    }

    public function shortcode_strip($atts): string {
        wp_enqueue_style('sov-dt', SOV_DT_URL . 'assets/sovereign-digital-twin.css', [], SOV_DT_VERSION);

        $a = shortcode_atts([
            'limit' => (string) get_option('sov_dt_strip_limit', 32),
        ], $atts, 'sovereign_front_member_strip');

        $limit = max(4, min(80, (int) $a['limit']));
        $users = get_users([
            'number' => $limit,
            'orderby' => 'registered',
            'order' => 'DESC',
        ]);

        ob_start();
        ?>
        <section class="sov-dt-strip-wrap" aria-label="<?php esc_attr_e('Community members', 'sovereign-digital-twin'); ?>">
            <div class="sov-dt-strip-head">
                <span class="nexros-sovereign-pill"><?php esc_html_e('Community', 'sovereign-digital-twin'); ?></span>
                <h2 class="sov-dt-strip-title nexros-sovereign-title"><?php esc_html_e('Digital twins & profiles', 'sovereign-digital-twin'); ?></h2>
            </div>
            <div class="sov-dt-strip-scroll" tabindex="0">
                <ul class="sov-dt-strip-list">
                    <?php foreach ($users as $u) :
                        $uid = (int) $u->ID;
                        $img = esc_url(self::resolve_image_or_placeholder($uid));
                        $name = esc_attr($u->display_name ?: $u->user_login);
                        ?>
                        <li class="sov-dt-strip-item">
                            <a href="<?php echo esc_url(get_author_posts_url($uid)); ?>" class="sov-dt-strip-link" title="<?php echo $name; ?>">
                                <span class="sov-dt-strip-ring">
                                    <img src="<?php echo $img; ?>" alt="" width="72" height="72" loading="lazy" decoding="async" />
                                </span>
                                <span class="sov-dt-strip-name"><?php echo esc_html($u->display_name ?: $u->user_login); ?></span>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </section>
        <?php
        return (string) ob_get_clean();
    }

    public function shortcode_settings(): string {
        if (!is_user_logged_in()) {
            return '<p class="sov-dt-login-hint nexros-sovereign-card">' . esc_html__('Log in to manage your digital twin and map visibility.', 'sovereign-digital-twin') . '</p>';
        }
        wp_enqueue_style('sov-dt', SOV_DT_URL . 'assets/sovereign-digital-twin.css', [], SOV_DT_VERSION);

        $uid = get_current_user_id();
        if (isset($_POST['sov_dt_nonce']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['sov_dt_nonce'])), 'sov_dt_save')) {
            $this->save_frontend_profile($uid);
        }

        $twin_id = (int) get_user_meta($uid, self::META_TWIN_ATTACHMENT, true);
        $lat = get_user_meta($uid, self::META_MAP_LAT, true);
        $lng = get_user_meta($uid, self::META_MAP_LNG, true);
        $pub = (bool) get_user_meta($uid, self::META_MAP_PUBLIC, true);
        $city = (string) get_user_meta($uid, self::META_MAP_CITY, true);

        ob_start();
        ?>
        <form method="post" class="sov-dt-settings nexros-sovereign-form" enctype="multipart/form-data">
            <?php wp_nonce_field('sov_dt_save', 'sov_dt_nonce'); ?>
            <h3 class="nexros-sovereign-title"><?php esc_html_e('Your digital twin image', 'sovereign-digital-twin'); ?></h3>
            <p class="nexros-sovereign-subtitle"><?php esc_html_e('Upload a portrait or avatar representing you on the member strip and map. If empty, your Gravatar / profile picture is used, then a neutral placeholder.', 'sovereign-digital-twin'); ?></p>
            <?php if (!current_user_can('upload_files')) : ?>
                <p class="nexros-sovereign-alert" style="border:1px solid var(--sv-border,#2f4d79);background:rgba(239,147,55,.1);"><?php esc_html_e('Your role cannot upload files here. Ask an administrator to grant upload capability or set your digital twin media ID on your user profile in the dashboard.', 'sovereign-digital-twin'); ?></p>
            <?php else : ?>
            <p class="field">
                <label for="sov_dt_file"><?php esc_html_e('Image file', 'sovereign-digital-twin'); ?></label>
                <input type="file" name="sov_dt_file" id="sov_dt_file" accept="image/jpeg,image/png,image/webp,image/gif" />
            </p>
            <?php endif; ?>
            <?php if ($twin_id) : ?>
                <p class="sov-dt-preview">
                    <img src="<?php echo esc_url(wp_get_attachment_image_url($twin_id, 'medium') ?: ''); ?>" alt="" width="120" height="120" style="border-radius:12px;border:1px solid var(--sv-border, #2f4d79);" />
                </p>
            <?php endif; ?>

            <h3 class="nexros-sovereign-title" style="margin-top:1.5rem;"><?php esc_html_e('Map location (optional)', 'sovereign-digital-twin'); ?></h3>
            <p class="field">
                <label for="sov_map_city"><?php esc_html_e('City / region label', 'sovereign-digital-twin'); ?></label>
                <input type="text" name="sov_map_city" id="sov_map_city" value="<?php echo esc_attr($city); ?>" />
            </p>
            <p class="field">
                <label for="sov_map_lat"><?php esc_html_e('Latitude', 'sovereign-digital-twin'); ?></label>
                <input type="text" name="sov_map_lat" id="sov_map_lat" value="<?php echo esc_attr((string) $lat); ?>" inputmode="decimal" placeholder="48.8584" />
            </p>
            <p class="field">
                <label for="sov_map_lng"><?php esc_html_e('Longitude', 'sovereign-digital-twin'); ?></label>
                <input type="text" name="sov_map_lng" id="sov_map_lng" value="<?php echo esc_attr((string) $lng); ?>" inputmode="decimal" placeholder="2.2945" />
            </p>
            <p class="field">
                <label>
                    <input type="checkbox" name="sov_map_public" value="1" <?php checked($pub); ?> />
                    <?php esc_html_e('Show me on the public member globe (requires latitude & longitude).', 'sovereign-digital-twin'); ?>
                </label>
            </p>
            <p>
                <button type="submit" class="nexros-sovereign-btn"><?php esc_html_e('Save', 'sovereign-digital-twin'); ?></button>
            </p>
        </form>
        <?php
        return (string) ob_get_clean();
    }

    private function save_frontend_profile(int $uid): void {
        if (!isset($_POST['sov_dt_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['sov_dt_nonce'])), 'sov_dt_save')) {
            return;
        }
        if (get_current_user_id() !== $uid && !current_user_can('edit_user', $uid)) {
            return;
        }

        if (!empty($_FILES['sov_dt_file']['tmp_name'])) {
            if (!current_user_can('upload_files')) {
                return;
            }
            if (!function_exists('wp_handle_upload')) {
                require_once ABSPATH . 'wp-admin/includes/file.php';
            }
            $file = $_FILES['sov_dt_file'];
            $overrides = ['test_form' => false];
            $move = wp_handle_upload($file, $overrides);
            if (!isset($move['error']) && isset($move['file'])) {
                $attachment = [
                    'post_mime_type' => $move['type'],
                    'post_title' => sanitize_file_name($file['name']),
                    'post_content' => '',
                    'post_status' => 'inherit',
                ];
                $attach_id = wp_insert_attachment($attachment, $move['file']);
                if (!is_wp_error($attach_id)) {
                    require_once ABSPATH . 'wp-admin/includes/image.php';
                    $meta = wp_generate_attachment_metadata($attach_id, $move['file']);
                    wp_update_attachment_metadata($attach_id, $meta);
                    update_user_meta($uid, self::META_TWIN_ATTACHMENT, $attach_id);
                }
            }
        }

        if (isset($_POST['sov_map_city'])) {
            update_user_meta($uid, self::META_MAP_CITY, sanitize_text_field(wp_unslash($_POST['sov_map_city'])));
        }
        if (isset($_POST['sov_map_lat'])) {
            update_user_meta($uid, self::META_MAP_LAT, $this->sanitize_coordinate(wp_unslash($_POST['sov_map_lat'])));
        }
        if (isset($_POST['sov_map_lng'])) {
            update_user_meta($uid, self::META_MAP_LNG, $this->sanitize_coordinate(wp_unslash($_POST['sov_map_lng'])));
        }
        update_user_meta($uid, self::META_MAP_PUBLIC, isset($_POST['sov_map_public']));
    }

    public function profile_fields(WP_User $user): void {
        if (!current_user_can('edit_user', $user->ID)) {
            return;
        }
        $twin_id = (int) get_user_meta($user->ID, self::META_TWIN_ATTACHMENT, true);
        $lat = get_user_meta($user->ID, self::META_MAP_LAT, true);
        $lng = get_user_meta($user->ID, self::META_MAP_LNG, true);
        $pub = (bool) get_user_meta($user->ID, self::META_MAP_PUBLIC, true);
        $city = (string) get_user_meta($user->ID, self::META_MAP_CITY, true);
        ?>
        <h2><?php esc_html_e('Digital twin & map', 'sovereign-digital-twin'); ?></h2>
        <table class="form-table">
            <tr>
                <th><label for="sov_digital_twin_attachment_id"><?php esc_html_e('Digital twin media ID', 'sovereign-digital-twin'); ?></label></th>
                <td>
                    <input type="number" name="sov_digital_twin_attachment_id" id="sov_digital_twin_attachment_id" value="<?php echo esc_attr((string) $twin_id); ?>" class="regular-text" />
                    <p class="description"><?php esc_html_e('Attachment ID from Media Library. Members can also upload from the front-end shortcode form.', 'sovereign-digital-twin'); ?></p>
                </td>
            </tr>
            <tr>
                <th><label for="sov_map_city"><?php esc_html_e('Map label', 'sovereign-digital-twin'); ?></label></th>
                <td><input type="text" name="sov_map_city" id="sov_map_city" value="<?php echo esc_attr($city); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="sov_map_lat"><?php esc_html_e('Latitude', 'sovereign-digital-twin'); ?></label></th>
                <td><input type="text" name="sov_map_lat" id="sov_map_lat" value="<?php echo esc_attr((string) $lat); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="sov_map_lng"><?php esc_html_e('Longitude', 'sovereign-digital-twin'); ?></label></th>
                <td><input type="text" name="sov_map_lng" id="sov_map_lng" value="<?php echo esc_attr((string) $lng); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><?php esc_html_e('Public on globe', 'sovereign-digital-twin'); ?></th>
                <td>
                    <label>
                        <input type="checkbox" name="sov_map_public" value="1" <?php checked($pub); ?> />
                        <?php esc_html_e('Include on public member map', 'sovereign-digital-twin'); ?>
                    </label>
                </td>
            </tr>
        </table>
        <?php
    }

    public function save_profile_fields(int $user_id): void {
        if (!current_user_can('edit_user', $user_id)) {
            return;
        }
        if (isset($_POST['sov_digital_twin_attachment_id'])) {
            update_user_meta($user_id, self::META_TWIN_ATTACHMENT, absint($_POST['sov_digital_twin_attachment_id']));
        }
        if (isset($_POST['sov_map_city'])) {
            update_user_meta($user_id, self::META_MAP_CITY, sanitize_text_field(wp_unslash($_POST['sov_map_city'])));
        }
        if (isset($_POST['sov_map_lat'])) {
            update_user_meta($user_id, self::META_MAP_LAT, $this->sanitize_coordinate(wp_unslash($_POST['sov_map_lat'])));
        }
        if (isset($_POST['sov_map_lng'])) {
            update_user_meta($user_id, self::META_MAP_LNG, $this->sanitize_coordinate(wp_unslash($_POST['sov_map_lng'])));
        }
        update_user_meta($user_id, self::META_MAP_PUBLIC, isset($_POST['sov_map_public']));
    }

    public function maybe_prepend_strip(string $content): string {
        if (!is_front_page() || !in_the_loop() || !is_main_query()) {
            return $content;
        }
        if (get_option('sov_dt_prepend_front', '0') !== '1') {
            return $content;
        }
        if (str_contains($content, 'sov-dt-strip-wrap')) {
            return $content;
        }
        return do_shortcode('[sovereign_front_member_strip]') . $content;
    }
}

Sovereign_Digital_Twin::instance();
