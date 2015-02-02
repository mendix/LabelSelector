dojo.provide("LabelSelect.widget.LabelSelect");
    
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dijit.form.ComboBox");

mendix.widget.declare("LabelSelect.widget.LabelSelect", {
    addons: [dijit._Contained],
    inputargs: {
        tagAssoc : '',
        tagAttrib : '',
        detailAttrib : '',
        tagConstraint : '',
        aftercreatemf : '',
        onchangemf : '',
        enableCreate : true,
    },
    
    existingLabels : null,
    currlabelNode : null,
    currLabels : null,
    tagAttr : null,
    container : null,
    firststartup : false,

    startup : function() {
        if (!this.firststartup) {
            this.firststartup = true;
            this.assoc = this.tagAssoc.split('/');
            this.tagAttr = this.tagAttrib.split('/')[2];
            this.existingLabels = {};
            this.currLabels = [];
            
            this.labelStore = dojo.mixin({

                _fetchItems : dojo.hitch(this, function(query, resultcallback){
                    var results = [];
                    var q = query.query.name.toLowerCase().replace(/^\*|\*$/g,'');  //remove surronding asterixes from the queryexpr

                    if (this.existingLabels != null) {
                        for(key in this.existingLabels) {
                            var lowkey = key.toLowerCase() ;
                            
                            if (q == "" || lowkey.indexOf(q) > -1) {
                                results.push(this.existingLabels[key]);
                            }
                        }
                    }
                    resultcallback(results, query);
                }),

                getValue : dojo.hitch(this, function(item, _) {
                   return item.get(this.tagAttr);                
                })

            }, dojo.data.util.simpleFetch);
            
            this.renderSelector();

            this.connect(this.domNode, 'onclick', dojo.hitch(this, function(e) {
                if (this.labelAssignInput) {
                    this.labelAssignInput.focus();
                }
                e && dojo.stopEvent(e);
                return false;
            }));
        }

        this.actRendered();
    },
    
    update : function (obj, callback) {
        if (obj != null) {
            if(this._refreshHandle){
                mx.data.unsubscribe(this._refreshHandle);
            } 
            var constraint = '//'+this.assoc[1]+(this.tagConstraint.replace('[%CurrentObject%]', obj.getGUID()));
            this.parentObj = obj;
            mx.processor.get({
                xpath : constraint,
                callback : dojo.hitch(this, this.processTags),
                error : function (e) {console.log('Error in LabelSelect: ', e)},
                filter : {
                    attributes : this.detailAttrib ? [this.tagAttr, this.detailAttrib.split("/")[2]] : [ this.tagAttr ],
                    sort : [[this.tagAttr, 'asc']]
                }
            });
            var self = this;
            this._refreshHandle = mx.data.subscribe({
                    guid     : obj.getGUID(),
                    callback : function(guid) {
                        while(self.currlabelNode.childNodes.length > 1)
                            dojo.destroy(self.currlabelNode.childNodes[0]);
                        self.update(obj, callback);
                    }
            });

        } else {
            while(this.currlabelNode.childNodes.length > 1)
                dojo.destroy(this.currlabelNode.childNodes[0]);

            this.currLabels = [];
        }
        callback && callback();
    },
    
    processTags : function (objects) {
        this.currLabels = [];
        var refObjs = this.parentObj.get(this.assoc[0]);
        dojo.forEach(objects, function (lab, i) {
            this.existingLabels[lab.get(this.tagAttr)] = lab;
            dojo.forEach(refObjs, function (ref, i) {
                if (ref === lab.getGUID())
                    this.currLabels.push(lab);
            }, this);
        }, this);
        
        while(this.currlabelNode.childNodes.length > 1)
            dojo.destroy(this.currlabelNode.childNodes[0]);

        dojo.forEach(this.currLabels, dojo.hitch(this, this.renderLabel));
        dojo.place(this.labelAssignInput.domNode, this.currlabelNode, 'last');
    },
    
    renderSelector : function () {

        this.container = mxui.dom.div({ 'class' : 'Label_container' });
        var inputNode = document.createElement("input");//mxui.dom.input({'type' : 'text'});
        inputNode.type = 'text';
        inputNode.value = '';

        this.currlabelNode = mxui.dom.div({ 'class' : 'Label_list' });

        dojo.place(this.container, this.domNode);
        dojo.place(this.currlabelNode, this.container);
        dojo.place(inputNode, this.container);

        //return;
        this.labelAssignInput =  new dijit.form.ComboBox({
            store:this.labelStore,
            queryExpr:"*${0}*",
            searchAttr:'name',
            searchDelay:0,
            tabIndex:0,
            ignoreCase: true,
            'class' : 'LabelSelect_combo',
            hasDownArrow:true,
            autoComplete:false,
            labelType : 'html',
/* MWE: doesn't seem to work :-( 
            labelType : 'text', 
            highlightMatch : 'all',
*/

            onBlur : dojo.hitch(this, function (e) {
                if (this.IEBlurBoolean && dojo.isIE) {
                    mxui.wm.focus.put(this.labelAssignInput.textbox);
                }
                this.IEBlurBoolean = false;
            }),

            onKeyPress : dojo.hitch(this, function(e) {
                if (e.keyCode == dojo.keys.TAB || e.keyCode == dojo.keys.ENTER) {
                    if (this.labelAssignInput.getValue() != '') {
                        dojo.stopEvent(e);
                        this.IEBlurBoolean = true;

                        if (this.labelAssignInput.item!= null) { //do not tab away if tab is used to select an item
                            this.addLabel(this.labelAssignInput.item);
                        } else {
                            if(this.enableCreate){
                               this.createLabel(dojo.trim(this.labelAssignInput.getValue())); 
                            }
                        }
                    }
                }
            }),

            onChange : dojo.hitch(this, function(e) {
                if (this.labelAssignInput.item != null)
                    this.addLabel(this.labelAssignInput.item);
                else if (dojo.trim(this.labelAssignInput.getValue()).length > 0 && this.enableCreate){
                    this.createLabel(dojo.trim(this.labelAssignInput.getValue())); 
                }
            }),

            labelFunc : dojo.hitch(this, function(item) {
                var str = "<span class='labelselect-dropdown-name'>" + mxui.dom.escapeHTML(item.get(this.tagAttr)) + "&nbsp;</span>";
                    if (this.detailAttrib)
                        str += "<span class='labelselect-dropdown-detail'>"  + mxui.dom.escapeHTML(item.get(this.detailAttrib.split("/")[2])) + "</span>";
                return str;
            })
        }, inputNode);

        
    },
    
    renderLabel : function (obj, i) {
        var containdiv = mendix.dom.div({ 'class' : 'LabelSelect_LabelContainer tg_column_tags'});
        var removeNode = mxui.dom.span({'class' : 'LabelSelect_remove tg_label_remove'}, 'x');
        this.connect(removeNode, 'onmouseenter', dojo.hitch(this, this.nodeHover, removeNode, true));
        this.connect(removeNode, 'onmouseleave', dojo.hitch(this, this.nodeHover, removeNode, false));
        this.connect(removeNode, 'onclick', dojo.hitch(this, this.removeLabel, obj, containdiv));

        var labelnode = mxui.dom.span({'class' : 'LabelSelect_label tg_label'}, obj.get(this.tagAttr));

        this.connect(labelnode, 'onmouseenter', dojo.hitch(this, this.nodeHover, labelnode, true));
        this.connect(labelnode, 'onmouseleave', dojo.hitch(this, this.nodeHover, labelnode, false));
        
        containdiv.appendChild(labelnode);
        labelnode.appendChild(removeNode);
        dojo.place(containdiv, this.currlabelNode, 'last');
        dojo.place(this.labelAssignInput.domNode, this.currlabelNode, 'last'); //always as last!
    },
    
    removeLabel : function (label, node, clickevt) {
        this.parentObj.removeReferences(this.assoc[0], [label.getGUID()]);
        dojo.destroy(node);
        this.currLabels.splice(dojo.indexOf(this.currLabels, label),1);
        mx.processor.save({
            mxobj : this.parentObj,
            callback : function () {
                this.execMF(this.onchangemf, this.parentObj, function () {});
            },
            error : function (e) {logger.error(e);}
        }, this);
    },
    
    nodeHover : function (node, add) {
        if (add === true)
            dojo.addClass(node, 'hover');
        else
            dojo.removeClass(node, 'hover');
    },
    
    addLabel : function (label, callback) {
        // Check if not already in
        this.labelAssignInput.set('value', '');
        if (dojo.indexOf(this.currLabels, label) > -1)
            return;
        
        this.labelAssignInput.set('value', '');
        
        this.parentObj.addReferences(this.assoc[0], [label.getGUID()]);
        mx.processor.save({
            mxobj : this.parentObj,
            callback : function () {
                this.execMF(this.onchangemf, this.parentObj, function () {});
            },
            error : function (e) {logger.error(e);}
        }, this);
        this.currLabels.push(label);
        if (!this.existingLabels[label.get(this.tagAttr)])
            this.existingLabels[label.get(this.tagAttr)] = label;
        this.renderLabel(label);
        this.labelAssignInput.focus();
        callback && callback();
    },
    
    createLabel : function (labelname) {
        if (labelname === '')
            return;
        
        for(var key in this.existingLabels) {
            if (dojo.trim(key.toLowerCase()) == dojo.trim(labelname.toLowerCase())) {
                this.addLabel(this.existingLabels[key]);
                return;
            }
        }
        
        this.labelAssignInput.set('value', '');
        mx.processor.create({
            entity : this.assoc[1],
            callback : function (newlabel) {
                newlabel.set(this.tagAttr, dojo.trim(labelname));
                mx.processor.commit({
                    mxobj : newlabel,
                    callback : dojo.hitch(this, function (label) {
                        this.addLabel(label, dojo.hitch(this, this.execMF, this.aftercreatemf, this.parentObj));
                    }, newlabel)
                });
            }
        }, this);
    },
    
    execMF : function (mf, obj) {
        if (mf !== '') {
            mx.processor.xasAction({
                error       : function() {
                    logger.error(this.id + "error: XAS error executing microflow");
                },
                callback    : function () {},
                actionname  : mf,
                applyto     : 'selection',
                guids       : [obj.getGUID()]
            });
        }
    }, 

    uninitialize : function() { 
        mx.data.unsubscribe(this._refreshHandle);
        if (this.labelAssignInput) {
			this.labelAssignInput.destroy();
		}
    }
});
