<?php 
$default_settings = [
    'style' => '',
    'text_placeholder' => '',
    'text_button' => '',
    'quick_user' => '',
];
$settings = array_merge($default_settings, $settings);
extract($settings);
?>

<div class="pxl-icon--users icon-item h-btn-user <?php echo esc_attr($settings['style']) ?>">
    <?php 
    if (is_user_logged_in()) {
        $current_user = wp_get_current_user();
        $display_name = $current_user->display_name;
        ?>
        <ul class="pxl-user-account">
            <a class="btn-text-nina" href="<?php echo esc_url(wp_logout_url()); ?>">
                <span class="pxl--btn-text" data-text="<?php echo esc_attr__('Log Out', 'nexros'); ?>">
                <?php
                    $chars = preg_split('//u', esc_html__('Log Out', 'nexros'), -1, PREG_SPLIT_NO_EMPTY);
                    foreach ($chars as $value) {
                        if($value == ' ') {
                            echo '<span class="spacer">&nbsp;</span>';
                        } else {
                            echo '<span>'.$value.'</span>';
                        }
                    }
                 ?>
                 </span>
            </a>
        </ul>
        <?php 
    } else {
        ?>
        <div class="pxl-is-not-login">
            <a href="javascript:void(0)" class="btn-sign-in"><span class="pxl--btn-text" data-text="<?php echo esc_attr__('Log In', 'nexros'); ?>"><?php echo esc_html__('Log In', 'nexros'); ?></span></a>
            <a href="javascript:void(0)" class="btn-sign-up"> 
                <ul class="pxl-sign-up-box">
                    <li class="pxl-shape-active">
                        <span class="pxl--btn-text" data-text="<?php if ($settings['style'] == 'style-1') { echo esc_attr__('Login', 'nexros'); } else { echo esc_attr__('Sign In dsasd', 'nexros'); } ?>"><?php if ($settings['style'] == 'style-1') {echo esc_html__('Login', 'nexros');} else {echo esc_html__('Sign In', 'nexros');} ?></span>
                    </li>
                    <li>
                        <span class="pxl--btn-text" data-text="<?php if ($settings['style'] == 'style-1') { echo esc_attr__('Get Started', 'nexros'); } else { echo esc_attr__('Sign Up', 'nexros'); } ?>"><?php if ($settings['style'] == 'style-1') { echo esc_html__('Get Started', 'nexros');} else {echo esc_html__('Sign Up', 'nexros');} ?></span>
                    </li>
                </ul>
                <div class="pxl-divider-move"></div>
            </a>
        </div>
        <?php 
    }
    ?>
</div> 