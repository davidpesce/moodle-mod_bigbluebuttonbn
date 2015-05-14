<?php
/**
 * Config all BigBlueButtonBN instances in this course.
 * 
 * @package   mod_bigbluebuttonbn
 * @author    Fred Dixon  (ffdixon [at] blindsidenetworks [dt] com)
 * @author    Jesus Federico  (jesus [at] blindsidenetworks [dt] com)
 * @copyright 2010-2015 Blindside Networks Inc.
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v2 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once(dirname(__FILE__).'/locallib.php');
require_once($CFG->dirroot.'/course/moodleform_mod.php');

class mod_bigbluebuttonbn_mod_form extends moodleform_mod {

    function definition() {

        global $CFG, $DB, $USER;

        $course_id = optional_param('course', 0, PARAM_INT); // course ID, or
        $course_module_id = optional_param('update', 0, PARAM_INT); // course_module ID, or
        if ($course_id) {
            $course = $DB->get_record('course', array('id' => $course_id), '*', MUST_EXIST);
            $bigbluebuttonbn = null;
        } else if ($course_module_id) {
            $cm = get_coursemodule_from_id('bigbluebuttonbn', $course_module_id, 0, false, MUST_EXIST);
            $course = $DB->get_record('course', array('id' => $cm->course), '*', MUST_EXIST);
            $bigbluebuttonbn = $DB->get_record('bigbluebuttonbn', array('id' => $cm->instance), '*', MUST_EXIST);
        }

        $context = bigbluebuttonbn_get_context_course($course->id);

        //BigBlueButton server data
        $url = trim(trim($CFG->bigbluebuttonbn_server_url),'/').'/';
        $shared_secret = trim($CFG->bigbluebuttonbn_shared_secret);

        //UI configuration options
        $voicebridge_editable = $CFG->bigbluebuttonbn_voicebridge_editable;
        $recording_default = $CFG->bigbluebuttonbn_recording_default;
        $recording_default_editable = $CFG->bigbluebuttonbn_recording_editable;
        $tagging_default = $CFG->bigbluebuttonbn_recordingtagging_default;
        $tagging_default_editable = $CFG->bigbluebuttonbn_recordingtagging_editable;
        $waitformoderator_default = $CFG->bigbluebuttonbn_waitformoderator_default;
        $waitformoderator_editable = $CFG->bigbluebuttonbn_waitformoderator_editable;
        $preuploadpresentation_enabled = $CFG->bigbluebuttonbn_preuploadpresentation_enabled;
        $predefinedprofile_enabled = $CFG->bigbluebuttonbn_predefinedprofile_enabled;

        //Validates if the BigBlueButton server is running 
        $serverVersion = bigbluebuttonbn_getServerVersion($url); 
        if ( !isset($serverVersion) ) {
            print_error( 'general_error_unable_connect', 'bigbluebuttonbn', $CFG->wwwroot.'/admin/settings.php?section=modsettingbigbluebuttonbn' );
        }

        $mform =& $this->_form;
        $current_activity =& $this->current;

        $predefinedprofiles = bigbluebuttonbn_get_predefinedprofiles();
        $json_predefinedprofiles = json_encode($predefinedprofiles);
        $html_predefinedprofiles = ''.
                '<script type="text/javascript">'."\n".
                '  var bigbluebuttonbn_predefinedprofiles = '.$json_predefinedprofiles.';'.
                '</script>'."\n";
        $mform->addElement('html', $html_predefinedprofiles);

        if( $predefinedprofile_enabled ) {
            $mform->addElement('select', 'type', get_string('mod_form_field_predefinedprofile', 'bigbluebuttonbn'), bigbluebuttonbn_get_predefinedprofile_display_array(), array("id" => "id_predefinedprofile", "onchange" => "bigbluebuttonbn_update_predefinedprofile();") );
        } else {
            $mform->addElement('hidden', 'type', '0', array("id" => "id_predefinedprofile"));
            $mform->setType('type', PARAM_INT);
        }

        //-------------------------------------------------------------------------------
        // First block starts here
        //-------------------------------------------------------------------------------
        $mform->addElement('header', 'general', get_string('mod_form_block_general', 'bigbluebuttonbn'));

        $mform->addElement('text', 'name', get_string('mod_form_field_name','bigbluebuttonbn'), 'maxlength="64" size="32"');
        $mform->setType('name', PARAM_TEXT);
        $mform->addRule('name', null, 'required', null, 'client');

        $this->add_intro_editor(false, get_string('mod_form_field_intro', 'bigbluebuttonbn'));
        $mform->setAdvanced('introeditor');

        // Display the label to the right of the checkbox so it looks better & matches rest of the form
        $coursedesc = $mform->getElement('showdescription');
        if(!empty($coursedesc)){
            $coursedesc->setText(' ' . $coursedesc->getLabel());
            $coursedesc->setLabel('&nbsp');
        }
        $mform->setAdvanced('showdescription');

        $mform->addElement('checkbox', 'newwindow', get_string('mod_form_field_newwindow', 'bigbluebuttonbn'));
        $mform->setDefault( 'newwindow', 0 );

        $mform->addElement('textarea', 'welcome', get_string('mod_form_field_welcome','bigbluebuttonbn'), 'wrap="virtual" rows="5" cols="60"');
        $mform->addHelpButton('welcome', 'mod_form_field_welcome', 'bigbluebuttonbn');
        $mform->setType('welcome', PARAM_TEXT);
        $mform->setAdvanced('welcome');

        if ( $voicebridge_editable ) {
            $mform->addElement('text', 'voicebridge', get_string('mod_form_field_voicebridge','bigbluebuttonbn'), array('maxlength'=>4, 'size'=>6));
            $mform->setType('voicebridge', PARAM_INT);
            $mform->addRule('voicebridge', get_string('mod_form_field_voicebridge_format_error', 'bigbluebuttonbn'), 'numeric', '####', 'server');
            $mform->setDefault( 'voicebridge', 0 );
            $mform->addHelpButton('voicebridge', 'mod_form_field_voicebridge', 'bigbluebuttonbn');
            $mform->setAdvanced('voicebridge');
        }

        if ( $waitformoderator_editable ) {
            $mform->addElement('checkbox', 'wait', get_string('mod_form_field_wait', 'bigbluebuttonbn'));
            $mform->addHelpButton('wait', 'mod_form_field_wait', 'bigbluebuttonbn');
            $mform->setType('wait', PARAM_INT);
            $mform->setDefault( 'wait', 1 );
            $mform->setAdvanced('wait');
        } else {
            $mform->addElement('hidden', 'wait', $waitformoderator_default );
            $mform->setType('wait', PARAM_INT);
        }
            
        if ( floatval($serverVersion) >= 0.8 ) {
            if ( $recording_default_editable ) {
                $mform->addElement('checkbox', 'record', get_string('mod_form_field_record', 'bigbluebuttonbn'));
                $mform->setDefault( 'record', $recording_default );
                $mform->setAdvanced('record');
            } else {
                $mform->addElement('hidden', 'record', $recording_default);
            }
            $mform->setType('record', PARAM_INT);

            if ( $tagging_default_editable ) {
                $mform->addElement('checkbox', 'tagging', get_string('mod_form_field_recordingtagging', 'bigbluebuttonbn'));
                $mform->setDefault('record', $tagging_default);
                $mform->setAdvanced('tagging');
            } else {
                $mform->addElement('hidden', 'tagging', $tagging_default );
            }
            $mform->setType('tagging', PARAM_INT);
        }
        //-------------------------------------------------------------------------------
        // First block ends here
        //-------------------------------------------------------------------------------


        //-------------------------------------------------------------------------------
        // Second block starts here
        //-------------------------------------------------------------------------------
        if ( $preuploadpresentation_enabled ) {
            $mform->addElement('header', 'preupload', get_string('mod_form_block_presentation', 'bigbluebuttonbn'));
            $mform->setExpanded('preupload');

            $filemanager_options = array();
            $filemanager_options['accepted_types'] = '*';
            $filemanager_options['maxbytes'] = 0; //$this->course->maxbytes;
            $filemanager_options['subdirs'] = 0;
            $filemanager_options['maxfiles'] = 1;
            $filemanager_options['mainfile'] = true;

            $mform->addElement('filemanager', 'presentation', get_string('selectfiles'), null, $filemanager_options);
            //$mform->addHelpButton('presentation', 'mod_form_field_presentation', 'bigbluebuttonbn');
        }
        //-------------------------------------------------------------------------------
        // Second block ends here
        //-------------------------------------------------------------------------------


        //-------------------------------------------------------------------------------
        // Third block starts here
        //-------------------------------------------------------------------------------
        $mform->addElement('header', 'permission', get_string('mod_form_block_participants', 'bigbluebuttonbn'));

        // Data required for "Add participant" and initial "Participant list" setup
        $roles = bigbluebuttonbn_get_roles();
        $users = bigbluebuttonbn_get_users($context);

        $participant_list = bigbluebuttonbn_get_participant_list($bigbluebuttonbn, $context);
        $mform->addElement('hidden', 'participants', json_encode($participant_list));
        $mform->setType('participants', PARAM_TEXT);

        $html_participant_selection = ''.
             '<div id="fitem_bigbluebuttonbn_participant_selection" class="fitem fitem_fselect">'."\n".
             '  <div class="fitemtitle">'."\n".
             '    <label for="bigbluebuttonbn_participant_selectiontype">'.get_string('mod_form_field_participant_add', 'bigbluebuttonbn').' </label>'."\n".
             '  </div>'."\n".
             '  <div class="felement fselect">'."\n".
             '    <select id="bigbluebuttonbn_participant_selection_type" onchange="bigbluebuttonbn_participant_selection_set(); return 0;">'."\n".
             '      <option value="all" selected="selected">'.get_string('mod_form_field_participant_list_type_all', 'bigbluebuttonbn').'</option>'."\n".
             '      <option value="role">'.get_string('mod_form_field_participant_list_type_role', 'bigbluebuttonbn').'</option>'."\n".
             '      <option value="user">'.get_string('mod_form_field_participant_list_type_user', 'bigbluebuttonbn').'</option>'."\n".
             '    </select>'."\n".
             '    &nbsp;&nbsp;'."\n".
             '    <select id="bigbluebuttonbn_participant_selection" disabled="disabled">'."\n".
             '      <option value="all" selected="selected">---------------</option>'."\n".
             '    </select>'."\n".
             '    &nbsp;&nbsp;'."\n".
             '    <input value="'.get_string('mod_form_field_participant_list_action_add', 'bigbluebuttonbn').'" type="button" id="id_addselectionid" onclick="bigbluebuttonbn_participant_add(); return 0;" />'."\n".
             '  </div>'."\n".
             '</div>'."\n".
             '<div id="fitem_bigbluebuttonbn_participant_list" class="fitem">'."\n".
             '  <div class="fitemtitle">'."\n".
             '    <label for="bigbluebuttonbn_participant_list">'.get_string('mod_form_field_participant_list', 'bigbluebuttonbn').' </label>'."\n".
             '  </div>'."\n".
             '  <div class="felement fselect">'."\n".
             '    <table id="participant_list_table">'."\n";

        // Add participant list
        foreach($participant_list as $participant){
            $participant_selectionid = '';
            $participant_selectiontype = $participant['selectiontype'];
            if( $participant_selectiontype == 'all') {
                $participant_selectiontype = '<b><i>'.get_string('mod_form_field_participant_list_type_'.$participant_selectiontype, 'bigbluebuttonbn').'</i></b>';
            } else {
                if ( $participant_selectiontype == 'role') {
                    $participant_selectionid = bigbluebuttonbn_get_role_name($participant['selectionid']);
                } else {
                    foreach($users as $user){
                        if( $user->id == $participant['selectionid']) {
                            $participant_selectionid = $user->firstname.' '.$user->lastname;
                            break;
                        }
                    }
                }
                $participant_selectiontype = '<b><i>'.get_string('mod_form_field_participant_list_type_'.$participant_selectiontype, 'bigbluebuttonbn').':</i></b>&nbsp;';
            }
            $participant_role = get_string('mod_form_field_participant_bbb_role_'.$participant['role'], 'bigbluebuttonbn');

            $html_participant_selection .= ''.
                '      <tr id="participant_list_tr_'.$participant['selectiontype'].'-'.$participant['selectionid'].'">'."\n".
                '        <td width="20px"><a onclick="bigbluebuttonbn_participant_remove(\''.$participant['selectiontype'].'\', \''.$participant['selectionid'].'\'); return 0;" title="'.get_string('mod_form_field_participant_list_action_remove', 'bigbluebuttonbn').'">x</a></td>'."\n".
                '        <td width="125px">'.$participant_selectiontype.'</td>'."\n".
                '        <td>'.$participant_selectionid.'</td>'."\n".
                '        <td><i>&nbsp;'.get_string('mod_form_field_participant_list_text_as', 'bigbluebuttonbn').'&nbsp;</i>'."\n".
                '          <select id="participant_list_role_'.$participant['selectiontype'].'-'.$participant['selectionid'].'" onchange="bigbluebuttonbn_participant_list_role_update(\''.$participant['selectiontype'].'\', \''.$participant['selectionid'].'\'); return 0;">'."\n".
                '            <option value="'.BIGBLUEBUTTONBN_ROLE_VIEWER.'" '.($participant['role'] == BIGBLUEBUTTONBN_ROLE_VIEWER? 'selected="selected" ': '').'>'.get_string('mod_form_field_participant_bbb_role_'.BIGBLUEBUTTONBN_ROLE_VIEWER, 'bigbluebuttonbn').'</option>'."\n".
                '            <option value="'.BIGBLUEBUTTONBN_ROLE_MODERATOR.'" '.($participant['role'] == BIGBLUEBUTTONBN_ROLE_MODERATOR? 'selected="selected" ': '').'>'.get_string('mod_form_field_participant_bbb_role_'.BIGBLUEBUTTONBN_ROLE_MODERATOR, 'bigbluebuttonbn').'</option><select>'."\n".
                '        </td>'."\n".
                '      </tr>'."\n";
        }

        $html_participant_selection .= ''.
             '    </table>'."\n".
             '  </div>'."\n".
             '</div>'."\n".
             '<script type="text/javascript" src="'.$CFG->wwwroot.'/mod/bigbluebuttonbn/mod_form.js">'."\n".
             '</script>'."\n";

        $mform->addElement('html', $html_participant_selection);

        // Add data
        $mform->addElement('html', '<script type="text/javascript">var bigbluebuttonbn_participant_selection = {"all": [], "role": '.json_encode($roles).', "user": '.bigbluebuttonbn_get_users_json($users).'}; </script>');
        $mform->addElement('html', '<script type="text/javascript">var bigbluebuttonbn_participant_list = '.json_encode($participant_list).'; </script>');
        $bigbluebuttonbn_strings = Array( "as" => get_string('mod_form_field_participant_list_text_as', 'bigbluebuttonbn'),
                                          "viewer" => get_string('mod_form_field_participant_bbb_role_viewer', 'bigbluebuttonbn'),
                                          "moderator" => get_string('mod_form_field_participant_bbb_role_moderator', 'bigbluebuttonbn'),
                                          "remove" => get_string('mod_form_field_participant_list_action_remove', 'bigbluebuttonbn'),
                                    );
        $mform->addElement('html', '<script type="text/javascript">var bigbluebuttonbn_strings = '.json_encode($bigbluebuttonbn_strings).'; </script>');
        //-------------------------------------------------------------------------------
        // Third block ends here
        //-------------------------------------------------------------------------------


        //-------------------------------------------------------------------------------
        // Fourth block starts here
        //-------------------------------------------------------------------------------
        $mform->addElement('header', 'schedule', get_string('mod_form_block_schedule', 'bigbluebuttonbn'));
        if( isset($current_activity->openingtime) && $current_activity->openingtime != 0 || isset($current_activity->closingtime) && $current_activity->closingtime != 0 )
            $mform->setExpanded('schedule');

        $mform->addElement('date_time_selector', 'openingtime', get_string('mod_form_field_openingtime', 'bigbluebuttonbn'), array('optional' => true));
        $mform->setDefault('openingtime', 0);
        $mform->addElement('date_time_selector', 'closingtime', get_string('mod_form_field_closingtime', 'bigbluebuttonbn'), array('optional' => true));
        $mform->setDefault('closingtime', 0);
        //-------------------------------------------------------------------------------
        // Fourth block ends here
        //-------------------------------------------------------------------------------


        //-------------------------------------------------------------------------------
        // add standard elements, common to all modules
        $this->standard_coursemodule_elements();

        //-------------------------------------------------------------------------------
        // add standard buttons, common to all modules
        $this->add_action_buttons();

        $html_preload_predefinedprofiles = ''.
                '<script type="text/javascript">'."\n".
                '  bigbluebuttonbn_update_predefinedprofile();'.
                '</script>'."\n";
        $mform->addElement('html', $html_preload_predefinedprofiles);
    }

    function data_preprocessing(&$default_values) {
        if ($this->current->instance) {
            // Editing existing instance - copy existing files into draft area.
            $draftitemid = file_get_submitted_draft_itemid('presentation');
            file_prepare_draft_area($draftitemid, $this->context->id, 'mod_bigbluebuttonbn', 'presentation', 0, array('subdirs'=>0, 'maxbytes' => 0, 'maxfiles' => 1, 'mainfile' => true));
            $default_values['presentation'] = $draftitemid;
        }
    }

    function validation($data, $files) {

        $errors = parent::validation($data, $files);

        if ( isset($data['openingtime']) && isset($data['closingtime']) ) {
            if ( $data['openingtime'] != 0 && $data['closingtime'] != 0 && $data['closingtime'] < $data['openingtime']) {
                $errors['closingtime'] = get_string('bbbduetimeoverstartingtime', 'bigbluebuttonbn');
            }
        }
        
        if ( isset($data['voicebridge']) ) {
            if ( !bigbluebuttonbn_voicebridge_unique($data['voicebridge'], $data['instance'])) {
                $errors['voicebridge'] = get_string('mod_form_field_voicebridge_notunique_error', 'bigbluebuttonbn');
            }
        }

        return $errors;
    }
}

?>
