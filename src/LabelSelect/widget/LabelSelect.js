/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, logger */
/*mendix */

define([
    'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
    'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/text',
    'LabelSelect/lib/jquery-1.11.2', 'dojo/text!LabelSelect/widget/template/LabelSelect.html'
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, dojoArray, lang, text, _jQuery, widgetTemplate) {
    'use strict';
    var $ = _jQuery.noConflict(true);

    return declare('LabelSelect.widget.LabelSelect', [_WidgetBase, _TemplatedMixin], {
        templateString: widgetTemplate,

        _handles: null,
        _contextObj: null,
        _listBox: null,
        _tagEntity: null,
        _tagAttribute: null,
        _refAttribute: null,
        _tagCache: null,

        constructor: function () {
            this._handles = [];
        },

        postCreate: function () {
            //set the variables:
            this._tagEntity = this.tagAssoc.split('/')[1];
            this._refAttribute = this.tagAssoc.split('/')[0];
            this._tagAttribute = this.tagAttrib.split('/')[2];
            this._tagCache = {}; //we need this to set references easily.

            this._listBox = domConstruct.create('ul', {
                'id': this.id + '_ListBox'
            });
            domConstruct.place(this._listBox, this.domNode);

            this._setupEvents();
        },

        update: function (obj, callback) {
            if (obj) {
                domStyle.set(this.domNode, "visibility", "visible");

                this._contextObj = obj;
                this._fetchCurrentLabels();
                this._resetSubscriptions();
            } else {
                domStyle.set(this.domNode, "visibility", "hidden");
            }
            callback();
        },

        _fetchCurrentLabels: function () {
            //fetch all referenced labels
            var xpath = '//' + this._tagEntity + this.tagConstraint.replace('[%CurrentObject%]', this._contextObj.getGuid());
            mx.data.get({
                xpath: xpath,
                callback: lang.hitch(this, this._processTags)
            });
        },


        _processTags: function (objs) {
            var refObjs = this._contextObj.get(this._refAttribute),
                tagArray = [],
                currentTags = [];
				
            dojoArray.forEach(objs, function (tagObj, index) {
                //clean up the text
                var value = dom.escapeString(tagObj.get(this._tagAttribute));
                //add tag to cache based on value
                this._tagCache[value] = tagObj;
                //check if this is a current tag
                dojoArray.forEach(refObjs, function (ref, i) {
                    if (ref === tagObj.getGUID()) {
                        currentTags.push(tagObj);
                    }
                }, this);
                //push the value to the array.
                tagArray.push(value);
            }, this);

            this._setOptions(tagArray);
            this._renderCurrentTags(currentTags);
        },

        _renderCurrentTags: function (currentTags) {
            //we're not using the plugin function "remove all" because we don't want to remove references
            var items = this._listBox.getElementsByTagName("li");
            while (items.length > 0) {
                //delete the all tags except the "input" field
                if (!domClass.contains(items[0], 'tagit-new')) {
                    domConstruct.destroy(items[0]);
                }
                //break if we're at the last item and this item is the input field 
                if (items.length === 1 && domClass.contains(items[0], 'tagit-new')) {
                    break;
                }
            }

            //create a tag for all items
            dojoArray.forEach(currentTags, function (tagObj, index) {
                var value = dom.escapeString(tagObj.get(this._tagAttribute));
                $('#' + this.id + '_ListBox').tagit("createTag", value);
            }, this);
        },

        _startTagger: function (options) {
            if (options) {
                $('#' + this.id + '_ListBox').tagit(options);
            } else {
                //fallback
                logger.warn('No options found, running defaults');
                $('#' + this.id + '_ListBox').tagit();
            }
        },


        _createTagobject: function (value) {
            //create a new tag
            mx.data.create({
                entity: this._tagEntity,
                callback: function (obj) {
                    //set the value
                    obj.set(this._tagAttribute, value);
                    //save
                    mx.data.save({
                        mxobj: obj,
                        callback: function () {
                            // save the label before calling the microflow to save the new label
                            this._contextObj.addReference(this._refAttribute, obj.getGuid());
                            this._saveObject();
                            //run the after create mf
                            if (this.aftercreatemf) {
                                this._execMf(this._contextObj.getGuid(), this.aftercreatemf);
                            } else {
                                console.log(this.id + ' - please add an after create mf to commit the object, otherwise ui is incorrectly displayed.');
                            }
                        }
                    }, this);
                },
                error: function (e) {
                    logger.error('Error creating object: ' + e);
                }
            }, this);
        },

        _execMf: function (guid, mf, cb) {
            if (guid && mf) {
                mx.data.action({
                    applyto: 'selection',
                    actionname: mf,
                    guids: [guid],
                    callback: function () {
                        if (cb) {
                            cb();
                        }
                    },
                    error: function (e) {
                        logger.error('Error running Microflow: ' + e);
                    }
                }, this);
            }
        },


        _resetSubscriptions: function () {
            var handle = null,
                attrHandle = null,
				thisObj = this,
                validationHandle = null;

            if (this._handles && this._handles.length && this._handles.length > 0) {
                dojoArray.forEach(this._handles, function (handle) {
                    thisObj.unsubscribe(handle);
                });
                this._handles = [];
            }

            if (this._contextObj) {
                handle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: function (guid) {
                        mx.data.get({
                            guid: guid,
                            callback: lang.hitch(this, function (obj) {
                                this._contextObj = obj;
                                this._fetchCurrentLabels();
                            })
                        });

                    }
                });
                attrHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this._refAttribute,
                    callback: lang.hitch(this, function (guid) {
                        mx.data.get({
                            guid: guid,
                            callback: lang.hitch(this, function (obj) {
                                this._contextObj = obj;
                                this._fetchCurrentLabels();
                            })
                        });
                    })
                });


                validationHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });

                this._handles.push(handle);
                this._handles.push(attrHandle);
                this._handles.push(validationHandle);
            }
        },

        _isReference: function (guid) {
            var isRef = false,
                refs = this._contextObj.getReferences(this._refAttribute);
			
			dojoArray.forEach(refs, function (ref, i) {
				if (ref === guid) {
					isRef = true;
				}
            });

            return isRef;
        },

        _saveObject: function () {
            mx.data.save({
                mxobj: this._contextObj,
                callback: function () {
                    this._execMf(this._contextObj.getGuid(), this.onchangemf);
                }
            }, this);
        },


        _setOptions: function (tagArray) {
            //TODO: allow users to set options
            var options = {
                    availableTags: tagArray,
                    autocomplete: {
                        delay: 0,
                        minLength: 0
                    },
                    enableCreate: this.enableCreate,
                    showAutocompleteOnFocus: this.showAutoCompleteOnFocus,
                    removeConfirmation: false,
                    caseSensitive: true,
                    allowDuplicates: false,
                    allowSpaces: false,
                    readOnly: this.readOnly,
                    tagLimit: null,
                    singleField: false,
                    singleFieldDelimiter: ',',
                    singleFieldNode: null,
                    tabIndex: null,
                    placeholderText: null,

                    afterTagAdded: lang.hitch(this, function (event, ui) {
                        this._clearValidations();
                        //fetch tag from cache
                        var tagObj = this._tagCache[ui.tagLabel];
                        if (tagObj) {
                            //check if already a reference
                            if (!this._isReference(tagObj.getGuid())) {
                                this._contextObj.addReference(this._refAttribute, tagObj.getGuid());
                                this._saveObject();
                            }
                        } else if (this.enableCreate) {
                            this._createTagobject(ui.tagLabel);
                        } else {
                            logger.warn('No Tag found for value: ' + ui.tagLabel);
                        }
                    }),

                    afterTagRemoved: lang.hitch(this, function (event, ui) {
                        this._clearValidations();
                        //fetch tag from cache
                        var tagObj = this._tagCache[ui.tagLabel];
                        if (tagObj) {
                            this._contextObj.removeReferences(this._refAttribute, [tagObj.getGuid()]);
                            this._saveObject();
                        } else {
                            logger.warn('No Tag found for value: ' + ui.tagLabel);
                        }
                    })
                };
            this._startTagger(options);
        },

        _handleValidation: function (validations) {
            this._clearValidations();

            var val = validations[0],
                msg = val.getReasonByAttribute(this._refAttribute);

            if (this.readOnly) {
                val.removeAttribute(this._refAttribute);
            } else {
                if (msg) {
                    this._addValidation(msg);
                    val.removeAttribute(this._refAttribute);
                }
            }
        },

        _clearValidations: function () {
            domConstruct.destroy(this._alertdiv);
        },

        _addValidation: function (msg) {
            this._alertdiv = domConstruct.create("div", {
                'class': 'alert alert-danger',
                innerHTML: msg
            });

            this.domNode.appendChild(this._alertdiv);
        }
    });
});

require(['LabelSelect/widget/LabelSelect'], function () {
    'use strict';
});