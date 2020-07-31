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

 * @module mod_bigbluebuttonbn/helpers
*/

define(['jquery', 'core/yui', 'core/notification', 'core/str'],
    function ($, yui, Notification, Str) {
        /**
         * Declare variables.
         */
        var elementTag = {};
        var elementFaClass = {};
        var elementActionReversed = {};

        var Helpers = {
            /**
             * Initialise helpers code.
             *
             * @method init
             */
            init: function () {
                elementTag = this.initElementTag();
                elementFaClass = this.initElementFAClass();
                elementActionReversed = this.initElementActionReversed();
            },

            updateData: function (data) {
                var self = this;
                var action, elementid, link, linkdataonclick, button, buttondatatext, buttondatatag;
                action = elementActionReversed[data.action];
                if (action === data.action) {
                    return;
                }
                var stringsToRetrieve = [
                    {
                        key: 'view_recording_list_actionbar_' + action,
                        component: 'bigbluebuttonbn'
                    }
                ];
                Str.get_strings(stringsToRetrieve)
                    .done(function (s) {
                        elementid = self.elementId(data.action, data.target);
                        console.log(elementid);
                        console.log(data.recordingid);
                        link = $('#' + elementid + '-' + data.recordingid);
                        link.attr('data-action', action);

                        linkdataonclick = link.attr('data-onclick').replace(self.capitalize(data.action), self.capitalize(action));

                        link.attr('data-onclick', linkdataonclick);
                        buttondatatext = s[0];
                        buttondatatag = elementTag[action];

                        button = link.find('i');
                        if (button === null) {
                            // For backward compatibility.
                            this.updateDataCompatible(link.find('img'), elementTag[data.action], buttondatatag, buttondatatext);
                            return;
                        }
                        button.attr('data-aria-label', buttondatatext);
                        button.attr('data-title', buttondatatext);
                        button.attr('data-class', elementFaClass[action]);

                    });
            },

            updateDataCompatible: function (button, action, buttondatatag, buttondatatext) {
                if (button === null) {
                    // Button doesn't have an icon.
                    return;
                }
                var buttondatasrc = button.attr('data-src');
                button.attr('data-alt', buttondatatext);
                button.attr('data-title', buttondatatext);
                button.attr('data-src', buttondatasrc.replace(buttondatatag, action));
            },

            updateId: function (data) {
                var action, elementid, link, button, id;
                action = elementActionReversed[data.action];
                if (action === data.action) {
                    return;
                }
                elementid = this.elementId(data.action, data.target);
                link = $('a#' + elementid + '-' + data.recordingid);
                id = '' + elementid.replace(data.action, action) + '-' + data.recordingid;
                link.attr('id', id);
                button = link.find('i');
                if (button === null) {
                    // For backward compatibility.
                    button = link.find('img');
                }
                button.removeAttr('id');
            },

            elementId: function (action, target) {
                var elementid = 'recording-' + action;
                if (typeof target !== 'undefined') {
                    elementid += '-' + target;
                }
                return elementid;
            },

            initElementTag: function () {
                var tags = {};
                tags.play = 'play';
                tags.publish = 'hide';
                tags.unpublish = 'show';
                tags.protect = 'lock';
                tags.unprotect = 'unlock';
                tags.edit = 'edit';
                tags.process = 'process';
                tags['import'] = 'import';
                tags['delete'] = 'delete';
                return tags;
            },

            initElementFAClass: function () {
                var tags = {};
                tags.publish = 'icon fa fa-eye-slash fa-fw iconsmall';
                tags.unpublish = 'icon fa fa-eye fa-fw iconsmall';
                tags.protect = 'icon fa fa-unlock fa-fw iconsmall';
                tags.unprotect = 'icon fa fa-lock fa-fw iconsmall';
                tags.edit = 'icon fa fa-pencil fa-fw iconsmall';
                tags.process = 'icon fa fa-spinner fa-spin iconsmall';
                tags['import'] = 'icon fa fa-download fa-fw iconsmall';
                tags['delete'] = 'icon fa fa-trash fa-fw iconsmall';
                return tags;
            },

            initElementActionReversed: function () {
                var actions = {};
                actions.play = 'play';
                actions.publish = 'unpublish';
                actions.unpublish = 'publish';
                actions.protect = 'unprotect';
                actions.unprotect = 'protect';
                actions.edit = 'edit';
                actions['import'] = 'import';
                actions['delete'] = 'delete';
                return actions;
            },

            reloadPreview: function (recordingid) {
                var thumbnails = $('#preview-' + recordingid).find('img');
                thumbnails.each(function (thumbnail) {
                    var thumbnailsrc = thumbnail.attr('src');
                    thumbnailsrc = thumbnailsrc.substring(0, thumbnailsrc.indexOf('?'));
                    thumbnailsrc += '?' + new Date().getTime();
                    thumbnail.attr('src', thumbnailsrc);
                });
            },

            capitalize: function (s) {
                return s.charAt(0).toUpperCase() + s.slice(1);
            },

            alertError: function (message, title) {
                if (typeof title == 'undefined') {
                    title = 'Error';
                }
                Notification.alert(title, message, 'Continue');
            }
        };

        return Helpers;

    });