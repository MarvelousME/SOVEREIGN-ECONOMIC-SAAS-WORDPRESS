<?php
namespace Elementor\TemplateLibrary;

use Elementor\Api;
use Elementor\Core\Common\Modules\Connect\Module as ConnectModule;
use Elementor\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Source_Custom extends Source_Base {

	const API_TEMPLATES_URL = 'https://my.elementor.com/api/connect/v1/library/templates';

	const TEMPLATES_DATA_TRANSIENT_KEY_PREFIX = 'elementor_remote_templates_data_';

	const LIBRARY_OPTION_KEY = 'custom_remote_info_library';

	const TIMESTAMP_CACHE_KEY = 'custom_remote_update_timestamp';

	public function __construct() {
		parent::__construct();

		$this->add_actions();
	}

	public function add_actions() {
		add_action( 'elementor/experiments/feature-state-change/container', [ $this, 'clear_cache' ], 10, 0 );
		 
	}
 

	public function get_id() {
		return 'remote';
	}

	public function get_title() {
		return esc_html__( 'Remote', 'elementor' );
	}

	public function register_data() {}

	public function get_items( $args = [] ) {
		$force_update = ! empty( $args['force_update'] ) && is_bool( $args['force_update'] );
 
		$templates_data = $this->get_templates_data( $force_update );
 
		$library_data = self::get_library_data();
 
		$templates = [];
 
		if ( ! empty( $library_data['templates'] ) ) {
			foreach ( $library_data['templates'] as $template_data ) {
				$templates[] = $this->prepare_template( $template_data );
			}
		}

		foreach ( $templates_data as $template_data ) {
			$templates[] = $this->prepare_template( $template_data );
		}
		  
		return $templates;
	}

	protected function get_templates_data( bool $force_update ): array {
		$templates_data_cache_key = static::TEMPLATES_DATA_TRANSIENT_KEY_PREFIX . ELEMENTOR_VERSION;

		$experiments_manager = Plugin::$instance->experiments;
		$editor_layout_type = $experiments_manager->is_feature_active( 'container' ) ? 'container_flexbox' : '';

		if ( $force_update ) {
			return $this->get_templates( $editor_layout_type );
		}

		$templates_data = get_transient( $templates_data_cache_key );

		if ( empty( $templates_data ) ) {
			return $this->get_templates( $editor_layout_type );
		}

		return $templates_data;
	}

	protected function get_templates( string $editor_layout_type ): array {
		$templates_data_cache_key = static::TEMPLATES_DATA_TRANSIENT_KEY_PREFIX . ELEMENTOR_VERSION;

		$templates_data = $this->get_templates_remotely( $editor_layout_type );

		if ( empty( $templates_data ) ) {
			return [];
		}

		set_transient( $templates_data_cache_key, $templates_data, 0 * HOUR_IN_SECONDS );

		return $templates_data;
	}

	protected function get_templates_remotely( string $editor_layout_type ) {
		$response = wp_remote_get( static::API_TEMPLATES_URL, [
			'body' => $this->get_templates_body_args( $editor_layout_type ),
		] );

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return false;
		}

		$templates_data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( empty( $templates_data ) || ! is_array( $templates_data ) ) {
			return [];
		}

		return $templates_data;
	}

	protected function get_templates_body_args( string $editor_layout_type ): array {
		return [
			'plugin_version' => ELEMENTOR_VERSION,
			'editor_layout_type' => $editor_layout_type,
		];
	}

	public static function get_library_data( $force_update = false ) {
		self::get_info_data( $force_update );

		$library_data = get_option( self::LIBRARY_OPTION_KEY );

		if ( empty( $library_data ) ) {
			return [];
		}

		return $library_data;
	}
	
	private static function get_info_data( $force_update = false ) { 
 		global $wp_filesystem;
 		$cache_key = self::TIMESTAMP_CACHE_KEY;
		$update_timestamp = get_transient( $cache_key );
 		
 		$elementor_update_timestamp = get_option( '_transient_timeout_elementor_remote_info_api_data_' . ELEMENTOR_VERSION );
		 
 		$info_file_path = get_template_directory().'/elements/template-library/info.json';
 		$info_data = []; 
 
		if ( $force_update || ! $update_timestamp || $update_timestamp != $elementor_update_timestamp ) {
			if( file_exists($info_file_path) ){
 
				$info_data = json_decode( $wp_filesystem->get_contents( $info_file_path ), true); 
	 			
				if ( isset( $info_data['library'] ) ) {
					if( !empty($info_data['library']['templates'])){
						$update_templates = []; 
						foreach ($info_data['library']['templates'] as $templates) {
							$templates['thumbnail'] = get_template_directory_uri() . '/elements/template-library/images/'.$templates['id'].'.jpg';
							if( file_exists( get_template_directory().'/elements/template-library/images/large/'.$templates['id'].'.jpg' )  ){
								$templates['url'] = get_template_directory_uri() . '/elements/template-library/images/large/'.$templates['id'].'.jpg';	
							}else{
								$templates['url'] = get_template_directory_uri() . '/elements/template-library/images/'.$templates['id'].'.jpg';
							}
							
							$update_templates[] = $templates;
						}
						$info_data['library']['templates'] = $update_templates;
					}
					update_option( self::LIBRARY_OPTION_KEY, $info_data['library'], 'no' );
   
				}else{
					set_transient( $cache_key, [], 2 * HOUR_IN_SECONDS );
					return false;
				}

				set_transient( $cache_key, $elementor_update_timestamp, 12 * HOUR_IN_SECONDS );
				 
			}
		}
 		return $info_data;
	}

	private function prepare_template( array $template_data ) {
		$favorite_templates = $this->get_user_meta( 'favorites' );

		// BC: Support legacy APIs that don't have access tiers.
		if ( isset( $template_data['access_tier'] ) ) {
			$access_tier = $template_data['access_tier'];
		} else {
			$access_tier = 0 === $template_data['access_level']
				? ConnectModule::ACCESS_TIER_FREE
				: ConnectModule::ACCESS_TIER_ESSENTIAL;
		}
		 
		return [
			'template_id' => $template_data['id'],
			'source' => $this->get_id(),
			'type' => $template_data['type'],
			'subtype' => $template_data['subtype'],
			'title' => $template_data['title'],
			'thumbnail' => $template_data['thumbnail'],
			'date' => $template_data['tmpl_created'],
			'author' => $template_data['author'],
			'tags' => json_decode( $template_data['tags'] ),
			'isPro' => ( '1' === $template_data['is_pro'] ),
			'accessLevel' => $template_data['access_level'],
			'accessTier' => $access_tier,
			'popularityIndex' => (int) $template_data['popularity_index'],
			'trendIndex' => (int) $template_data['trend_index'],
			'hasPageSettings' => ( '1' === $template_data['has_page_settings'] ),
			'url' => $template_data['url'],
			'favorite' => ! empty( $favorite_templates[ $template_data['id'] ] ),
		];
	}

	public function get_item( $template_id ) {
		$templates = $this->get_items();

		return $templates[ $template_id ];
	}
 
	public function save_item( $template_data ) {
		return new \WP_Error( 'invalid_request', 'Cannot save template to a remote source' );
	}
 
	public function update_item( $new_data ) {
		return new \WP_Error( 'invalid_request', 'Cannot update template to a remote source' );
	}

	 
	public function delete_template( $template_id ) {
		return new \WP_Error( 'invalid_request', 'Cannot delete template from a remote source' );
	}

	 
	public function export_template( $template_id ) {
		return new \WP_Error( 'invalid_request', 'Cannot export template from a remote source' );
	}

	 
	public function get_data( array $args, $context = 'display' ) {
		 
		if( strpos($args['template_id'], 'pxl_') !== false){
			$data = self::get_template_content( $args['template_id'] );
		}else{
			$data = Api::get_template_content( $args['template_id'] );
		}
		 
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		// Set the Request's state as an Elementor upload request, in order to support unfiltered file uploads.
		Plugin::$instance->uploads_manager->set_elementor_upload_state( true );

		// BC.
		$data = (array) $data;

		$data['content'] = $this->replace_elements_ids( $data['content'] );
		$data['content'] = $this->process_export_import_content( $data['content'], 'on_import' );

		$post_id = $args['editor_post_id'];
		$document = Plugin::$instance->documents->get( $post_id );
		if ( $document ) {
			$data['content'] = $document->get_elements_raw_data( $data['content'], true );
		}

		// After the upload complete, set the elementor upload state back to false
		Plugin::$instance->uploads_manager->set_elementor_upload_state( false );

		return $data;
	}
	 
	public static function get_template_content( $template_id ) {
		global $wp_filesystem;
		$template_content_url = get_template_directory().'/elements/template-library/'.$template_id.'.json';
		 
		if( !file_exists($template_content_url) ) return [];	

		$template_content = json_decode( $wp_filesystem->get_contents( $template_content_url ), true);    
 

		if ( empty( $template_content['content'] ) ) {
			return new \WP_Error( 'template_data_error', 'An invalid data was returned.' );
		}

		return $template_content;
	}
   
	public function clear_cache() {
		delete_transient( self::TIMESTAMP_CACHE_KEY );
		delete_transient( static::TEMPLATES_DATA_TRANSIENT_KEY_PREFIX . ELEMENTOR_VERSION );
	}
}
