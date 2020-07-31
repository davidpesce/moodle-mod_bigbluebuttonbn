// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package   mod_bigbluebuttonbn
 * @copyright 2020 onwards, Blindside Networks Inc
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author    David Pesce  (david.pesce [at] exputo [dt] com)

 * @module mod_bigbluebuttonbn/recordings
*/

define(['jquery', 'core/config', 'core/str', 'mod_bigbluebuttonbn/helpers',
    'core/yui', 'core/modal_factory', 'core/modal_events'],
    function ($, mdlcfg, str, Helpers, yui, ModalFactory, ModalEvents) {

        /**
         * Declare variables.
         */
        var datasource = null;

        /**
         * jQuery selectors for easy reference.
         */
        var SELECTORS = {
            FORM_SEARCH_RECORDINGS: '#bigbluebuttonbn_recordings_searchform',
            SEARCH_TEXT: '#searchtext',
            RECORDING_IMPORTED: 'data-imported'
        };

        var Recordings = {
            /**
            * Initialize recording display. Set onclick handlers for publish, un-publish, delete, update, or protect.
            */
            init: function () {
                var self = this;
                datasource = mdlcfg.wwwroot + "/mod/bigbluebuttonbn/bbb_ajax.php?sesskey=" + mdlcfg.sesskey + "&";

                //Add onclick event listeners to delete buttons
                $('[id^=recording-delete-]').each(function (i, val) {
                    $(val).click(function () {
                        self.recordingDelete(val);
                    });
                });

                //Add onclick event listeners to un-publish.
                $('[id^=recording-unpublish-]').each(function (i, val) {
                    $(val).click(function () {
                        self.recordingUnpublish(val);
                    });
                });

                //Add onclick event listeners to publish.
                $('[id^=recording-publish-]').each(function (i, val) {
                    $(val).click(function () {
                        self.recordingPublish(val);
                    });
                });

                Helpers.init();
            },

            /**
             * Obtain and return the JQuery objects related to the action performed.
             *
             * @param {jQuery} element
             * @returns {{action: jQuery, meetingid: jQuery, recordingid: jQuery}}
             */
            recordingElementPayload: function (element) {
                var parent_div = $(element).closest('div');
                return {
                    action: $(element).attr('data-action'),
                    recordingid: parent_div.attr('data-recordingid'),
                    meetingid: parent_div.attr('data-meetingid')
                };
            },

            /**
             * Determine the requested action and display confirmation (if needed).
             *
             * @param {jQuery} element
             * @param {boolean} confirmation
             * @param {Object} extras
             */
            recordingAction: function (element, confirmation, extras) {
                var self = this;
                var payload = this.recordingElementPayload(element);
                for (var attrname in extras) {
                    payload[attrname] = extras[attrname];
                }
                // The action doesn't require confirmation.
                if (!confirmation) {
                    self.recordingActionPerform(payload);
                    return;
                }

                // Create the confirmation dialogue.
                ModalFactory.create({
                    type: ModalFactory.types.SAVE_CANCEL,
                    title: 'Are you sure?',
                    body: self.recordingConfirmationMessage(payload)
                })
                    .then(function (modal) {
                        modal.setSaveButtonText('Delete');
                        modal.getRoot().on(ModalEvents.save, function () {
                            self.recordingActionPerform(payload);
                        });
                        modal.show();
                    });
            },

            /**
             * Perform the requested recording action.
             *
             * @param {Object} data
             */
            recordingActionPerform: function (data) {
                var self = this;
                var qs = "action=recording_" + data.action + "&id=" + data.recordingid + "&idx=" + data.meetingid;
                qs += this.recordingActionMetaQS(data);
                data.attempt = 1;
                if (typeof data.attempts === 'undefined') {
                    data.attempts = 5;
                }
                $.getJSON({
                    url: datasource + qs
                })
                    .done(function (response) {
                        // There is no need to verify the state.
                        if (typeof data.goalstate === 'undefined') {
                            return self.recordingActionCompletion(data);
                        }
                        // Use the current response for verification.
                        if (data.attempts <= 1) {
                            return self.recordingActionPerformedComplete(response, data);
                        }
                        // Iterate the verification.
                        return self.recordingActionPerformedValidate(data);
                    })
                    .fail(function (jqXHR, textStatus) {
                        data.message = "Request failed: " + textStatus + " responseText: " + jqXHR.responseText;
                        return self.recordingActionFailover(data);
                    });
            },

            /**
             * Gathers additional metadata to be included in query string.
             *
             * @param {Object} data
             * @returns {string}
             */
            recordingActionMetaQS: function (data) {
                var qs = '';
                if (typeof data.source !== 'undefined') {
                    var meta = {};
                    meta[data.source] = encodeURIComponent(data.goalstate);
                    qs += "&meta=" + JSON.stringify(meta);
                }
                return qs;
            },

            /**
             *
             * @param {Object} data
             */
            recordingActionPerformedValidate: function (data) {
                var self = this;
                var qs = "action=recording_info&id=" + data.recordingid + "&idx=" + data.meetingid;
                qs += this.recordingActionMetaQS(data);
                $.getJSON({
                    url: datasource + qs
                })
                    .done(function (response) {
                        // Evaluates if the current attempt has been completed.
                        if (self.recordingActionPerformedComplete(response, data)) {
                            // It has been completed, so stop the action.
                            return;
                        }
                        // Evaluates if more attempts have to be performed.
                        if (data.attempt < data.attempts) {
                            data.attempt += 1;
                            setTimeout(((function () {
                                return function () {
                                    self.recordingActionPerformedValidate(data);
                                };
                            })(this)), (data.attempt - 1) * 1000);
                            return;
                        }
                        // No more attempts to perform, it stops with failing over.
                        data.message = str.get_string('view_error_action_not_completed', 'bigbluebuttonbn');
                        self.recordingActionFailover(data);

                    })
                    .fail(function (jqXHR, textStatus) {
                        data.message = "Request failed: " + textStatus + " responseText: " + jqXHR.responseText;
                        self.recordingActionFailover(data);
                    });
            },

            /**
             * Determines if the action performed has completed.
             *
             * @param e
             * @param {Object} data
             * @returns {boolean}
             */
            recordingActionPerformedComplete: function (e, data) {
                var self = this;
                var stringsToRetrieve = [
                    {
                        key: 'view_error_current_state_not_found',
                        component: 'bigbluebuttonbn'
                    }
                ];
                str.get_strings(stringsToRetrieve)
                    .done(function (s) {
                        // Something went wrong.
                        if (typeof e[data.source] === 'undefined') {
                            data.message = s[0];
                            self.recordingActionFailover(data);
                            return true;
                        }
                        // Evaluates if the state is as expected.
                        if (e[data.source] === data.goalstate) {
                            self.recordingActionCompletion(data);
                            return true;
                        }
                        return false;
                    });
            },

            /**
             * Returns the current state of a recording based on action.
             *
             * @param {string} action - publish, unpublish, delete, protect, update
             * @param {Object} data
             * @returns {null|Item.updated|string|boolean|*}
             */
            recordingCurrentState: function (action, data) {
                if (action === 'publish' || action === 'unpublish') {
                    return data.published;
                }
                if (action === 'delete') {
                    return data.status;
                }
                if (action === 'protect' || action === 'unprotect') {
                    return data.secured; // The broker responds with secured as protected is a reserved word.
                }
                if (action === 'update') {
                    return data.updated;
                }
                return null;
            },

            recordingPublish: function (element) {
                var extras = {
                    source: 'published',
                    goalstate: 'true'
                };
                this.recordingAction(element, false, extras);
            },

            recordingUnpublish: function (element) {
                var extras = {
                    source: 'published',
                    goalstate: 'false'
                };
                this.recordingAction(element, false, extras);
            },

            recordingProtect: function (element) {
                var extras = {
                    source: 'protected',
                    goalstate: 'true'
                };
                this.recordingAction(element, false, extras);
            },

            recordingUnprotect: function (element) {
                var extras = {
                    source: 'protected',
                    goalstate: 'false'
                };
                this.recordingAction(element, false, extras);
            },

            /**
             * Initiates the recording delete request.
             *
             * @param {jQuery} element
             */
            recordingDelete: function (element) {
                var extras = {
                    source: 'found',
                    goalstate: false
                };
                var requireConfirmation = true;
                if (this.recordingIsImported(element)) {
                    // When recordingDelete is performed on imported recordings use default response for validation.
                    requireConfirmation = false;
                    extras.source = 'status';
                    extras.goalstate = true;
                    extras.attempts = 1;
                }
                this.recordingAction(element, requireConfirmation, extras);
            },

            recordingImport: function (element) {
                var extras = {};
                this.recordingAction(element, true, extras);
            },

            recordingUpdate: function (element) {
                var nodeelement = Y.one(element);
                var node = nodeelement.ancestor('div');
                var extras = {
                    target: node.getAttribute('data-target'),
                    source: node.getAttribute('data-source'),
                    goalstate: nodeelement.getAttribute('data-goalstate')
                };
                this.recordingAction(element, false, extras);
            },

            recordingEdit: function (element) {
                var link = Y.one(element);
                var node = link.ancestor('div');
                var text = node.one('> span');
                text.hide();
                link.hide();
                var inputtext = Y.Node.create('<input type="text" class="form-control"></input>');
                inputtext.setAttribute('id', link.getAttribute('id'));
                inputtext.setAttribute('value', text.getHTML());
                inputtext.setAttribute('data-value', text.getHTML());
                inputtext.on('keydown', this.recordingEditKeydown);
                inputtext.on('focusout', this.recordingEditOnfocusout);
                node.append(inputtext);
                inputtext.focus().select();
            },

            recordingEditKeydown: function (event) {
                var keyCode = event.which || event.keyCode;
                if (keyCode == 13) {
                    this.recordingEditPerform(event.currentTarget);
                    return;
                }
                if (keyCode == 27) {
                    this.recordingEditOnfocusout(event.currentTarget);
                }
            },

            recordingEditOnfocusout: function (nodeelement) {
                var node = nodeelement.ancestor('div');
                nodeelement.hide();
                node.one('> span').show();
                node.one('> a').show();
            },

            recordingEditPerform: function (nodeelement) {
                var node = nodeelement.ancestor('div');
                var text = nodeelement.get('value').trim();
                // Perform the update.
                nodeelement.setAttribute('data-action', 'edit');
                nodeelement.setAttribute('data-goalstate', text);
                nodeelement.hide();
                this.recordingUpdate(nodeelement.getDOMNode());
                node.one('> span').setHTML(text).show();
                node.one('> a').show();
            },

            recordingEditCompletion: function (data, failed) {
                var elementid = Helpers.elementId(data.action, data.target);
                var link = Y.one('a#' + elementid + '-' + data.recordingid);
                var node = link.ancestor('div');
                var text = node.one('> span');
                if (typeof text === 'undefined') {
                    return;
                }
                var inputtext = node.one('> input');
                if (failed) {
                    text.setHTML(inputtext.getAttribute('data-value'));
                }
                inputtext.remove();
            },

            recordingPlay: function (element) {
                var nodeelement = Y.one(element);
                if (nodeelement.getAttribute('data-href') === '') {
                    Helpers.alertError(
                        M.util.get_string('view_recording_format_errror_unreachable', 'bigbluebuttonbn')
                    );
                    return;
                }
                var extras = {
                    target: nodeelement.getAttribute('data-target'),
                    source: 'published',
                    goalstate: 'true',
                    attempts: 1,
                    dataset: nodeelement.getData()
                };
                // New window for video play must be created previous to ajax requests.
                this.windowVideoPlay = window.open('', '_blank');
                // Prevent malicious modification over window opener to use window.open().
                this.windowVideoPlay.opener = null;
                this.recordingAction(element, false, extras);
            },

            /**
             * Return appropriate message to display in confirmation dialog.
             *
             * @param data
             * @returns {string|*}
             */
            recordingConfirmationMessage: function (data) {
                var confirmation, recordingType, elementid, associatedLinks, confirmationWarning;
                var stringsToRetrieve = [
                    {
                        key: 'view_recording_' + data.action + '_confirmation',
                        component: 'bigbluebuttonbn'
                    },
                    {
                        key: 'view_recording',
                        component: 'bigbluebuttonbn'
                    },
                    {
                        key: 'view_recording_link',
                        component: 'bigbluebuttonbn'
                    }
                    ,
                    {
                        key: 'view_recording_' + data.action + '_confirmation_warning_p',
                        component: 'bigbluebuttonbn'
                    }
                    ,
                    {
                        key: 'view_recording_' + data.action + '_confirmation_warning_s',
                        component: 'bigbluebuttonbn'
                    }
                ];
                str.get_strings(stringsToRetrieve)
                    .done(function (s) {
                        confirmation = s[0];
                        if (typeof confirmation === 'undefined') {
                            return '';
                        }

                        recordingType = s[1];
                        if (Y.one('#playbacks-' + data.recordingid).get('dataset').imported === 'true') {
                            recordingType = s[2];
                        }

                        confirmation = confirmation.replace("{$a}", recordingType);
                        if (data.action === 'import') {
                            return confirmation;
                        }
                        // If it has associated links imported in a different course/activity, show that in confirmation dialog.
                        elementid = Helpers.elementId(data.action, data.target);
                        associatedLinks = Y.one('a#' + elementid + '-' + data.recordingid).get('dataset').links;
                        if (associatedLinks === 0) {
                            return confirmation;
                        }

                        confirmationWarning = s[3];
                        if (associatedLinks === 1) {
                            confirmationWarning = s[4];
                        }

                        confirmationWarning = confirmationWarning.replace("{$a}", associatedLinks) + '. ';
                        return confirmationWarning + '\n\n' + confirmation;
                    });
            },

            /**
             * Refreshes/clears the DOM after an action is performed.
             *
             * @param {Object} data
             */
            recordingActionCompletion: function (data) {
                var container, table, row;
                var stringsToRetrieve = [
                    {
                        key: 'view_message_norecordings',
                        component: 'bigbluebuttonbn'
                    }
                ];

                if (data.action === 'delete') {
                    str.get_strings(stringsToRetrieve)
                        .done(function (s) {
                            row = $('div#recording-actionbar-' + data.recordingid).closest('td').closest('tr');
                            table = row.closest('tbody');

                            if (table.children('tr').length) {
                                container = $('#bigbluebuttonbn_view_recordings_content');
                                container.before('<span>' + s + '</span>');
                                $('#bigbluebuttonbn_recordings_table').remove();
                                return;
                            }
                            row.remove();
                            return;
                        });

                }
                if (data.action === 'import') {
                    row = Y.one('div#recording-actionbar-' + data.recordingid).ancestor('td').ancestor('tr');
                    row.remove();
                    return;
                }
                if (data.action === 'play') {
                    // Update url in window video to show the video.
                    this.windowVideoPlay.location.href = data.dataset.href;
                    return;
                }
                Helpers.updateData(data);
                Helpers.updateId(data);
                if (data.action === 'publish') {
                    this.recordingPublishCompletion(data.recordingid);
                    return;
                }
                if (data.action === 'unpublish') {
                    this.recordingUnpublishCompletion(data.recordingid);
                    return;
                }
            },

            recordingActionFailover: function (data) {
                Helpers.alertError(data.message);
                if (data.action === 'edit') {
                    this.recordingEditCompletion(data, true);
                }
            },

            recordingPublishCompletion: function (recordingid) {
                var playbacks = $('#playbacks-' + recordingid);
                playbacks.show();
                var preview = $('#preview-' + recordingid);
                if (preview === null) {
                    return;
                }
                preview.show();
                Helpers.reloadPreview(recordingid);
            },

            recordingUnpublishCompletion: function (recordingid) {
                var playbacks = $('#playbacks-' + recordingid);
                playbacks.hide();
                var preview = $('#preview-' + recordingid);
                if (preview === null) {
                    return;
                }
                preview.hide();
            },

            /**
             * Determines if recording was imported.
             *
             * @param {jQuery} element
             * @returns {jQuery}
             */
            recordingIsImported: function (element) {
                return $(element).prop(SELECTORS.RECORDING_IMPORTED);
            }
        };

        return Recordings;
    });