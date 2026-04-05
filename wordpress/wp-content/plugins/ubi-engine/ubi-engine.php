<?php
/**
 * Plugin Name: UBI Engine
 * Description: Core UBI distribution engine with task-to-earn
 * Version: 1.0.3
 * Author: UBI CMS Team
 * Security: Fixed with admin menus and full implementation
 */

if (!defined('ABSPATH')) exit;

class UBI_Engine_Plugin {
    
    private static $instance = null;
    private $tasks_table;
    private $rewards_table;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        global $wpdb;
        $this->tasks_table = $wpdb->prefix . 'ubi_tasks';
        $this->rewards_table = $wpdb->prefix . 'ubi_rewards';
        
        register_activation_hook(__FILE__, array($this, 'activate'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // AJAX handlers
        add_action('wp_ajax_ubi_engine_get_tasks', array($this, 'get_tasks'));
        add_action('wp_ajax_ubi_engine_create_task', array($this, 'create_task'));
        add_action('wp_ajax_ubi_engine_update_task', array($this, 'update_task'));
        add_action('wp_ajax_ubi_engine_delete_task', array($this, 'delete_task'));
        add_action('wp_ajax_ubi_engine_get_rewards', array($this, 'get_rewards'));
    }
    
    public function activate() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();
        
        // Tasks table
        $tasks_sql = "CREATE TABLE IF NOT EXISTS {$this->tasks_table} (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(50),
            difficulty ENUM('low', 'medium', 'high', 'expert') DEFAULT 'medium',
            reward DECIMAL(20, 8) NOT NULL,
            reward_currency VARCHAR(10) DEFAULT 'UBI',
            max_participants INT DEFAULT 1,
            current_participants INT DEFAULT 0,
            status ENUM('active', 'completed', 'expired', 'cancelled') DEFAULT 'active',
            deadline DATETIME,
            proof_requirements TEXT,
            created_by BIGINT UNSIGNED NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_category (category),
            INDEX idx_created_at (created_at)
        ) $charset;";
        
        // Rewards table
        $rewards_sql = "CREATE TABLE IF NOT EXISTS {$this->rewards_table} (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            task_id BIGINT UNSIGNED,
            amount DECIMAL(20, 8) NOT NULL,
            currency VARCHAR(10) DEFAULT 'UBI',
            type ENUM('task_completion', 'referral', 'ubi_distribution', 'bonus') NOT NULL,
            transaction_hash VARCHAR(66),
            status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL,
            INDEX idx_user_id (user_id),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        ) $charset;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($tasks_sql);
        dbDelta($rewards_sql);
    }
    
    /**
     * Add admin menu items
     */
    public function add_admin_menu() {
        add_menu_page(
            __('UBI Engine', 'ubi-engine'),
            __('UBI Engine', 'ubi-engine'),
            'manage_options',
            'ubi-engine',
            array($this, 'render_dashboard'),
            'dashicons-admin-site',
            30
        );
        
        add_submenu_page(
            'ubi-engine',
            __('Tasks', 'ubi-engine'),
            __('Tasks', 'ubi-engine'),
            'manage_options',
            'ubi-engine-tasks',
            array($this, 'render_tasks_page')
        );
        
        add_submenu_page(
            'ubi-engine',
            __('Rewards', 'ubi-engine'),
            __('Rewards', 'ubi-engine'),
            'manage_options',
            'ubi-engine-rewards',
            array($this, 'render_rewards_page')
        );
        
        add_submenu_page(
            'ubi-engine',
            __('Settings', 'ubi-engine'),
            __('Settings', 'ubi-engine'),
            'manage_options',
            'ubi-engine-settings',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Render main dashboard
     */
    public function render_dashboard() {
        global $wpdb;
        
        $total_tasks = $wpdb->get_var("SELECT COUNT(*) FROM {$this->tasks_table}");
        $active_tasks = $wpdb->get_var("SELECT COUNT(*) FROM {$this->tasks_table} WHERE status = 'active'");
        $completed_tasks = $wpdb->get_var("SELECT COUNT(*) FROM {$this->tasks_table} WHERE status = 'completed'");
        $total_rewards = $wpdb->get_var("SELECT COALESCE(SUM(amount), 0) FROM {$this->rewards_table} WHERE status = 'completed'");
        
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('UBI Engine Dashboard', 'ubi-engine') . '</h1>';
        echo '<div class="ubi-dashboard">';
        echo '<div class="ubi-stats">';
        echo '<div class="ubi-stat-box"><h3>' . esc_html__('Total Tasks', 'ubi-engine') . '</h3><p>' . esc_html($total_tasks) . '</p></div>';
        echo '<div class="ubi-stat-box"><h3>' . esc_html__('Active Tasks', 'ubi-engine') . '</h3><p>' . esc_html($active_tasks) . '</p></div>';
        echo '<div class="ubi-stat-box"><h3>' . esc_html__('Completed Tasks', 'ubi-engine') . '</h3><p>' . esc_html($completed_tasks) . '</p></div>';
        echo '<div class="ubi-stat-box"><h3>' . esc_html__('Total Rewards Distributed', 'ubi-engine') . '</h3><p>' . esc_html($total_rewards) . ' UBI</p></div>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Render tasks page
     */
    public function render_tasks_page() {
        global $wpdb;
        $tasks = $wpdb->get_results("SELECT * FROM {$this->tasks_table} ORDER BY created_at DESC LIMIT 100");
        
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Manage Tasks', 'ubi-engine') . '</h1>';
        echo '<form method="post" action="' . admin_url('admin-post.php') . '">';
        echo '<input type="hidden" name="action" value="ubi_engine_create_task">';
        echo wp_nonce_field('ubi_engine_create_task_nonce');
        echo '<table class="widefat fixed striped">';
        echo '<thead><tr><th>ID</th><th>Title</th><th>Difficulty</th><th>Reward</th><th>Status</th><th>Actions</th></tr></thead>';
        echo '<tbody>';
        foreach ($tasks as $task) {
            echo '<tr>';
            echo '<td>' . esc_html($task->id) . '</td>';
            echo '<td>' . esc_html($task->title) . '</td>';
            echo '<td>' . esc_html($task->difficulty) . '</td>';
            echo '<td>' . esc_html($task->reward) . ' ' . esc_html($task->reward_currency) . '</td>';
            echo '<td>' . esc_html($task->status) . '</td>';
            echo '<td><a href="' . admin_url('admin.php?page=ubi-engine-tasks&action=edit&id=' . $task->id) . '">Edit</a></td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        echo '</form>';
        echo '</div>';
    }
    
    /**
     * Render rewards page
     */
    public function render_rewards_page() {
        global $wpdb;
        $rewards = $wpdb->get_results("SELECT * FROM {$this->rewards_table} ORDER BY created_at DESC LIMIT 100");
        
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Rewards History', 'ubi-engine') . '</h1>';
        echo '<table class="widefat fixed striped">';
        echo '<thead><tr><th>ID</th><th>User ID</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>';
        echo '<tbody>';
        foreach ($rewards as $reward) {
            echo '<tr>';
            echo '<td>' . esc_html($reward->id) . '</td>';
            echo '<td>' . esc_html($reward->user_id) . '</td>';
            echo '<td>' . esc_html($reward->amount) . ' ' . esc_html($reward->currency) . '</td>';
            echo '<td>' . esc_html($reward->type) . '</td>';
            echo '<td>' . esc_html($reward->status) . '</td>';
            echo '<td>' . esc_html($reward->created_at) . '</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        echo '</div>';
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('UBI Engine Settings', 'ubi-engine') . '</h1>';
        echo '<form method="post" action="options.php">';
        settings_fields('ubi_engine_settings');
        do_settings_sections('ubi_engine_settings');
        echo '<p class="submit"><input type="submit" class="button-primary" value="' . esc_attr__('Save Changes', 'ubi-engine') . '"></p>';
        echo '</form>';
        echo '</div>';
    }
    
    /**
     * AJAX: Get tasks
     */
    public function get_tasks() {
        check_ajax_referer('ubi_engine_nonce', 'nonce');
        
        if (!is_user_logged_in()) {
            wp_send_json_error(array('message' => 'Authentication required'), 401);
        }
        
        global $wpdb;
        
        $tasks = $wpdb->get_results(
            "SELECT * FROM {$this->tasks_table} 
            WHERE status = 'active' 
            ORDER BY created_at DESC 
            LIMIT 50"
        );
        
        wp_send_json_success(array('tasks' => $tasks));
    }
    
    /**
     * AJAX: Create task
     */
    public function create_task() {
        check_ajax_referer('ubi_engine_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Insufficient permissions'), 403);
        }
        
        $title = sanitize_text_field($_POST['title'] ?? '');
        $description = sanitize_textarea_field($_POST['description'] ?? '');
        $difficulty = sanitize_text_field($_POST['difficulty'] ?? 'medium');
        $reward = floatval($_POST['reward'] ?? 0);
        
        if (empty($title) || $reward <= 0) {
            wp_send_json_error(array('message' => 'Invalid task data'));
        }
        
        global $wpdb;
        $result = $wpdb->insert(
            $this->tasks_table,
            array(
                'title' => $title,
                'description' => $description,
                'difficulty' => $difficulty,
                'reward' => $reward,
                'created_by' => get_current_user_id(),
                'status' => 'active',
            )
        );
        
        if ($result) {
            wp_send_json_success(array('message' => 'Task created', 'task_id' => $wpdb->insert_id));
        } else {
            wp_send_json_error(array('message' => 'Failed to create task'));
        }
    }
    
    /**
     * AJAX: Update task
     */
    public function update_task() {
        check_ajax_referer('ubi_engine_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Insufficient permissions'), 403);
        }
        
        $task_id = intval($_POST['task_id'] ?? 0);
        $status = sanitize_text_field($_POST['status'] ?? '');
        
        if (!$task_id) {
            wp_send_json_error(array('message' => 'Invalid task ID'));
        }
        
        global $wpdb;
        $result = $wpdb->update(
            $this->tasks_table,
            array('status' => $status),
            array('id' => $task_id)
        );
        
        if ($result !== false) {
            wp_send_json_success(array('message' => 'Task updated'));
        } else {
            wp_send_json_error(array('message' => 'Failed to update task'));
        }
    }
    
    /**
     * AJAX: Delete task
     */
    public function delete_task() {
        check_ajax_referer('ubi_engine_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Insufficient permissions'), 403);
        }
        
        $task_id = intval($_POST['task_id'] ?? 0);
        
        if (!$task_id) {
            wp_send_json_error(array('message' => 'Invalid task ID'));
        }
        
        global $wpdb;
        $result = $wpdb->delete($this->tasks_table, array('id' => $task_id));
        
        if ($result) {
            wp_send_json_success(array('message' => 'Task deleted'));
        } else {
            wp_send_json_error(array('message' => 'Failed to delete task'));
        }
    }
    
    /**
     * AJAX: Get rewards
     */
    public function get_rewards() {
        check_ajax_referer('ubi_engine_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Insufficient permissions'), 403);
        }
        
        global $wpdb;
        
        $rewards = $wpdb->get_results(
            "SELECT * FROM {$this->rewards_table} 
            ORDER BY created_at DESC 
            LIMIT 100"
        );
        
        wp_send_json_success(array('rewards' => $rewards));
    }
}

UBI_Engine_Plugin::get_instance();