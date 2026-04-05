<?php if(!function_exists('nexros_configs')){
    function nexros_configs($value){
        $configs = [
            'theme_colors' => [
                'primary'   => [
                    'title' => esc_html__('Primary', 'nexros'), 
                    'value' => nexros()->get_opt('primary_color', '#0B282E')
                ],
                'secondary'   => [
                    'title' => esc_html__('Secondary', 'nexros'), 
                    'value' => nexros()->get_opt('secondary_color', '#0C2C33')
                ],
                'third'   => [
                    'title' => esc_html__('Third', 'nexros'), 
                    'value' => nexros()->get_opt('third_color', '#444444')
                ],
                'four'   => [
                    'title' => esc_html__('Four', 'nexros'), 
                    'value' => nexros()->get_opt('four_color', '#483886')
                ],
                'body_bg'   => [
                    'title' => esc_html__('Body Background Color', 'nexros'), 
                    'value' => nexros()->get_opt('body_bg_color', '#fff')
                ]
            ],

            'link' => [
                'color' => nexros()->get_opt('link_color', ['regular' => '#0C2C33'])['regular'],
                'color-hover'   => nexros()->get_opt('link_color', ['hover' => '#0B282E'])['hover'],
                'color-active'  => nexros()->get_opt('link_color', ['active' => '#0B282E'])['active'],
            ],
            'gradient' => [
                'color-from' => nexros()->get_opt('gradient_color', ['from' => '#00614B'])['from'],
                'color-to' => nexros()->get_opt('gradient_color', ['to' => '#73A145'])['to'],
            ],
            'gradient_two' => [
                'color-from_two' => nexros()->get_opt('gradient_color_two', ['from' => '#9E85FF'])['from'],
                'color-to_two' => nexros()->get_opt('gradient_color_two', ['to' => '#2C1A74'])['to'],
            ],
        ];
        return $configs[$value];
    }
}
if(!function_exists('nexros_inline_styles')) {
    function nexros_inline_styles() {  

        $theme_colors      = nexros_configs('theme_colors');
        $link_color        = nexros_configs('link');
        $gradient_color        = nexros_configs('gradient');
        $gradient_color_two        = nexros_configs('gradient_two');
        ob_start();
        echo ':root{';

        foreach ($theme_colors as $color => $value) {
            printf('--%1$s-color: %2$s;', str_replace('#', '',$color),  $value['value']);
        }
        foreach ($theme_colors as $color => $value) {
            printf('--%1$s-color-rgb: %2$s;', str_replace('#', '',$color),  nexros_hex_rgb($value['value']));
        }
        foreach ($link_color as $color => $value) {
            printf('--link-%1$s: %2$s;', $color, $value);
        } 
        foreach ($gradient_color as $color => $value) {
            printf('--gradient-%1$s: %2$s;', $color, $value);
        } 
        foreach ($gradient_color_two as $color => $value) {
            printf('--gradient-two-%1$s: %2$s;', $color, $value);
        } 
        echo '}';

        return ob_get_clean();

    }
}
