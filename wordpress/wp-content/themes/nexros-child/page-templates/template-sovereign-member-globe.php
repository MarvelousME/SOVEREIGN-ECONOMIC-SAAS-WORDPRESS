<?php
/**
 * Template Name: Sovereign — Member globe & digital twins
 * Description: Full-width topographic member map and optional intro; uses Nexros layout and Sovereign child styling.
 *
 * @package Nexros_Child
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$nexros_sidebar = function_exists('nexros') ? nexros()->get_sidebar_args(['type' => 'page', 'content_col' => '12']) : ['wrap_class' => '', 'content_class' => 'col-12', 'sidebar_class' => ''];
$classes = 'container';
if (class_exists('\Elementor\Plugin') && empty($nexros_sidebar['sidebar_class']) && is_singular()) {
    $eid = get_the_ID();
    if ($eid) {
        $doc = \Elementor\Plugin::$instance->documents->get($eid);
        if ($doc && method_exists($doc, 'is_built_with_elementor') && $doc->is_built_with_elementor()) {
            $classes = 'elementor-container';
        }
    }
}
?>
<div class="<?php echo esc_attr($classes); ?>">
    <div class="row <?php echo esc_attr($nexros_sidebar['wrap_class']); ?>">
        <div id="pxl-content-area" class="<?php echo esc_attr($nexros_sidebar['content_class']); ?>">
            <main id="pxl-content-main">
                <?php
                while (have_posts()) {
                    the_post();
                    ?>
                    <article id="post-<?php the_ID(); ?>" <?php post_class('sov-dt-page-article'); ?>>
                        <header class="entry-header" style="margin-bottom:1.5rem;">
                            <?php the_title('<h1 class="entry-title" style="color:var(--sv-text,#fff);">', '</h1>'); ?>
                            <?php if (get_the_content()) : ?>
                                <div class="entry-content nexros-sovereign-subtitle" style="max-width:48rem;">
                                    <?php the_content(); ?>
                                </div>
                            <?php endif; ?>
                        </header>
                        <?php echo do_shortcode('[sovereign_member_globe height="560px"]'); ?>
                    </article>
                    <?php
                }
                ?>
            </main>
        </div>
    </div>
</div>
<?php
get_footer();
