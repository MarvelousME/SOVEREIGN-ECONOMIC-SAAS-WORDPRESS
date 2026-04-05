<?php
/**
 * @package Tnex-Themes
 */
?>
</div><!-- #main -->
<?php if (!is_404()) {
	 nexros()->footer->getFooter();
} ?>
<?php if (class_exists('Tnex_User')) { ?>
	<?php nexros_user_form(); ?>
<?php } ?>
<?php do_action( 'pxl_anchor_target') ?>
</div><!-- #wrapper -->
<?php wp_footer(); ?>
</body>
</html>
