(function($) {
    'use strict';

    function editWidget(widgetType) {
        $('#widget_type').val(widgetType);
        $('#widget-edit-modal').show();
    }

    window.editWidget = editWidget;

    $(document).ready(function() {
        $('#widget-edit-modal').closest('form').on('submit', function() {
            return confirm('Save widget configuration?');
        });
    });

})(jQuery);
