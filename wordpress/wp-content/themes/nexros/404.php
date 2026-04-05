<?php
/**
 * @package Tnex-Themes
 */
$subtitle_404 = nexros()->get_theme_opt('subtitle_404');
$title_404 = nexros()->get_theme_opt('title_404');
$des_404 = nexros()->get_theme_opt('des_404');
$button_404 = nexros()->get_theme_opt('button_404');
get_header(); ?>

<div class="pxl-shape-container shape-404-left" style="display: grid;gap: 0; grid-template-columns: repeat(3, 1fr);"><div class="grid-item pxl-animated" style="background-color:#18545D; opacity:0; animation-delay:0s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.3; animation-delay:0.05s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.1s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0; animation-delay:0.15s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.4; animation-delay:0.2s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.3; animation-delay:0.25s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.2; animation-delay:0.3s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.35s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.4; animation-delay:0.4s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.3; animation-delay:0.45s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.2; animation-delay:0.5s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.55s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.6s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0; animation-delay:0.65s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0.5; animation-delay:0.7s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.75s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div></div>
<div class="wrap-content-404 container" >
            <h1 class="pxl-error-title wow fadeInUp">
                <?php echo esc_html__('404', 'nexros'); ?>
            </h1>
            <div class="pxl-error-subtitle wow fadeInUp">
                <?php if (!empty($title_404)) {
                    echo pxl_print_html($title_404);
                } else{
                    echo esc_html__('Sorry! Page not found.', 'nexros'); 
                } ?>

            </div>
            <p class="pxl-error-description wow fadeInUp">
                <?php if (!empty($des_404)) {
                    echo pxl_print_html($des_404);
                } else{
                    echo esc_html__('The resource you are looking for doesn\'t exist or might have been removed.', 'nexros');
                } ?>
            </p>
            <a class="btn-sm wow fadeInUp" href="<?php echo esc_url(home_url('/')); ?>" >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="12" viewBox="0 0 13 12" fill="none">
                        <path d="M5.16667 1.3335L0.5 6.00016M0.5 6.00016L5.16667 10.6668M0.5 6.00016L12.5 6.00016" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                <span>
                    <?php if (!empty($button_404)) {
                        echo pxl_print_html($button_404);
                    } else{
                       echo esc_html__('back to homepage', 'nexros'); 
                   } ?>
               </span>
           </a>
</div>
<div class="pxl-shape-container shape-404-right" style="display: grid;gap: 0; grid-template-columns: repeat(3, 1fr);"><div class="grid-item pxl-animated" style="background-color:#130E59; opacity:0; animation-delay:0s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.3; animation-delay:0.05s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.1s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0; animation-delay:0.15s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.4; animation-delay:0.2s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.3; animation-delay:0.25s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.2; animation-delay:0.3s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.35s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.4; animation-delay:0.4s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.3; animation-delay:0.45s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.2; animation-delay:0.5s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item pxl-animated" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.55s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.6s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0; animation-delay:0.65s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0.5; animation-delay:0.7s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div><div class="grid-item" style="background-color:#0B282E33; opacity:0.1; animation-delay:0.75s; width: 100%; aspect-ratio: 1;mix-blend-mode: overlay;"></div></div>
<?php get_footer();
