define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "ImageEditor/lib/fabric",
    "ImageEditor/lib/canvas-to-blob",


    "dojo/text!ImageEditor/widget/template/ImageEditor.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent, fabric, canvasToBlob, widgetTemplate) {
    "use strict";

    return declare("ImageEditor.widget.ImageEditor", [_WidgetBase, _TemplatedMixin], {

        templateString: widgetTemplate,

        // nodes
        canvasNode: null,
        widgetBase: null,
        addTextButtonNode: null,
        addArrowButtonNode: null,
        saveButtonNode: null,
        deleteButtonNode: null,
        increaseFontButtonNode: null,
        makeBlueButton7Node: null,
        textFontSizeNode: null,
        fontFamilyNode: null,

        //modeler variables
        canvasHeight: 500,
        canvasWidth: 900,
        imAttribute: null,
        imageMapping: null, // {imKey: string, imImage: image}
        pathToParent: null,
        onUploadComplete: null,

        // Internal variables.
        _handles: null,
        _contextObj: null,

        constructor: function() {
            this._handles = [];
        },

        postCreate: function() {
            logger.debug(this.id + ".postCreate");

            this.canvas = new fabric.Canvas(this.canvasNode);



            // fabric.Image.fromURL('/img/MyFirstModule$_16_base_back.png', function (oImg) {
            //     this.canvas.add(oImg);
            // }.bind(this));

            this._setupEvents();
            this.saveButtonNode.innerText = this.SaveText;
            this.cancelButtonNode.innerText = this.CancelText;
            this.addTextButtonNode.innerText = this.AddTextText;
            this.addArrowButtonNode.innerText = this.AddArrowText;
            this.deleteButtonNode.innerText = this.RemoveItemText;
            this.annotateTextNode.innerText = this.AnnotateOptionsText;
            this.ColorTextNode.innerText = this.ColorText;
            this.FontSizeTextNode.innerText = this.FontSizeText;

            },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            if (this._contextObj) {
                this._drawDefaultCMB();
            }
            this._updateRendering(callback);
        },

        resize: function(box) {
            logger.debug(this.id + ".resize");
            // this._resizeCanvas(); // could resize to window?
            this._updateRendering();
        },

        uninitialize: function() {
            logger.debug(this.id + ".uninitialize");
        },

        _updateRendering: function(callback) {
            logger.debug(this.id + "._updateRendering");
            this._resizeCanvas();
            this._drawCanvasBackground();
            this._executeCallback(callback, "_updateRendering");
        },

        // Shorthand for running a microflow
        _execMf: function(mf, guid, cb) {
            logger.debug(this.id + "._execMf");
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    callback: lang.hitch(this, function(objs) {
                        if (cb && typeof cb === "function") {
                            cb(objs);
                        }
                    }),
                    error: function(error) {
                        console.debug(error.description);
                    }
                }, this);
            }
        },

        // Shorthand for executing a callback, adds logging to your inspector
        _executeCallback: function(cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        },

        /**
         * resize the canvas when the window changes size
        //  */
        _resizeCanvas: function() {
            this.canvasNode.width = this.canvasWidth;
            this.canvasNode.height = this.canvasHeight;
            this.canvas.setWidth(this.canvasWidth);
            this.canvas.setHeight(this.canvasHeight);
            this.canvas.calcOffset();
        },

        _plotImageFromContext: function() {

        },

        /**
         * REQUIRES CONTEXT
         * - resizes the canvas
         */
        _drawCanvasBackground: function() {
            var imgUrl = mx.data.getDocumentUrl(this._contextObj.getGuid(), this._contextObj.get("changedDate"), false);
            fabric.Image.fromURL(imgUrl, function(img) {
                var imgWidth = img.width,
                    imgHeight = img.height,
                    aspectRatio = imgHeight / imgWidth,
                    canvasWidth = this.canvas.width,
                    canvasHeight = this.canvas.width * aspectRatio,
                    scaleFactor = canvasWidth / imgWidth;
                img.set({
                    width: imgWidth,
                    height: imgHeight,
                    originX: 'left',
                    originY: 'top',
                    scaleX: scaleFactor,
                    scaleY: scaleFactor
                });
                this.canvas.setWidth(canvasWidth);
                this.canvas.setHeight(canvasHeight);
                this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas));
            }.bind(this));
        },

        _setupEvents: function() {

            this.connect(this.addTextButtonNode, "click", this._drawInteractiveText);
            this.connect(this.addArrowButtonNode, "click", this._drawArrow);
            this.connect(this.saveButtonNode, "click", this._saveToNewImage);
            this.connect(this.cancelButtonNode, "click", this._cancel);
            this.connect(this.deleteButtonNode, "click", this._deleteObject);

            this.connect(this.textFontSizeNode, "change", this._changeFontSize);
            this.connect(this.textColorNode, "change", this._changeColor);
            this.connect(this.fontFamilyNode, "change", this._changeFontFamily);

            // setup button events

            this.connect(this.makeRedButtonNode, "click", this._makeSpecColor);
            this.connect(this.makeBlue, "click", this._makeSpecColor);
            this.connect(this.makeBlackButtonNode, "click", this._makeSpecColor);
            this.connect(this.makeGreenButtonNode, "click", this._makeSpecColor);
            this.connect(this.makeYellowButtonNode, "click", this._makeSpecColor);
            this.connect(this.makeWhiteButtonNode, "click", this._makeSpecColor);

            // set up text based events

            this.connect(this.increaseFont, "click", this._increaseFont);
            this.connect(this.decreaseFont, "click", this._decreaseFont);


            // setup canvas events

            this.canvas.on('object:rotating', function() {
                var obj = this.getActiveObject();
                obj.set({
                    opacity: 0.5
                });
                this.renderAll();
            });

            this.canvas.on('touch:longpress', function() {
                var obj = this.getActiveObject();
                alert("ouch")    
            });

            this.canvas.on('object:scaling', function() {
                var obj = this.getActiveObject();
                obj.set({
                    opacity: 0.5
                });

                /*
                                Arrows could be fancier but lets leave it at that for now 
                                TODO:  make arrows that handle edge cases better
                                if (obj.isArrow) {

                                    var triangle = obj.item(1),
                                    group = obj;
                                    scaleX = triangle.width / group.getWidth();
                                    scaleY = circle.height / group.getHeight();
                                    triangle.setScaleX(scaleX);
                                    triangle.setScaleY(scaleY);

                                   
                                }
                */
                this.renderAll();


            });

            this.canvas.on('object:moving', function() {
                var obj = this.getActiveObject();
                obj.set({
                    opacity: 0.5
                });
                this.renderAll();
            });

            this.canvas.on('mouse:up', function() {
                var obj = this.getActiveObject();
                obj.set({
                    opacity: 1.0
                });
                this.renderAll();
            });

            this.canvas.on('object:selected', function() {

                var activeObject = this.getActiveObject();

                if (activeObject.isCMB) {
                    document.getElementById("text-controller").style.visibility = 'hidden';
                    document.getElementById("color-controller").style.visibility = 'hidden';
                } else if (activeObject.type === 'i-text') {
                    document.getElementById("text-controller").style.visibility = 'visible';
                    document.getElementById("color-controller").style.visibility = 'visible';

                    // TODO:  why doesn't this work?
                    // document.getElementById("text-selector").value = activeObject.fontFamilyNode;

                } else if (activeObject.isArrow) {
                    document.getElementById("text-controller").style.visibility = 'hidden';
                    document.getElementById("color-controller").style.visibility = 'visible';
                } else {
                    document.getElementById("color-controller").style.visibility = 'hidden';
                    document.getElementById("text-controller").style.visibility = 'hidden';
                }


            });

            this.canvas.on('selection:cleared', function() {


                document.getElementById("color-controller").style.visibility = 'hidden';
                document.getElementById("text-controller").style.visibility = 'hidden';




            });

        },

        _increaseFont: function() {
            var activeObject = this.canvas.getActiveObject()
            if (activeObject.type === 'i-text') {
                var currentFont = activeObject.fontSize;
                if (currentFont + 2 < 120) {
                    activeObject.setFontSize(currentFont + 2);
                } else {
                    activeObject.setFontSize(120);
                }
            }

            this.canvas.renderAll();


        },
        _decreaseFont: function() {
            var activeObject = this.canvas.getActiveObject()
            if (activeObject.type === 'i-text') {
                var currentFont = activeObject.fontSize;
                if (currentFont - 2 > 5) {
                    activeObject.setFontSize(currentFont - 2);
                } else {
                    activeObject.setFontSize(5);
                }
            }

            this.canvas.renderAll();

        },

        _makeSpecColor: function(event) {
            var activeObject = this.canvas.getActiveObject()
            var colorOptions = {
                'red': '#ca261a',
                'blue': '#0467c6',
                'black': '#333333',
                'green': '#098a00',
                'yellow': '#ffbf05',
                'white' : '	#FFFFFF'
            };
            var hexColor = colorOptions[event.srcElement.value];
            if (activeObject.type === 'i-text') {
                //text box
                activeObject.set("fill", hexColor);
                activeObject.set("stroke", hexColor);
            } else {
                //arrow which is two pieces (TODO: necessary to have both?)
                for (var item in activeObject._objects) {
                    item = activeObject._objects[item];
                    item.set("fill", hexColor);
                    item.set("stroke", hexColor);
                }
            }
            this.canvas.renderAll();

        },

        _changeFontFamily: function() {

            this.canvas.getActiveObject().setFontFamily(this.fontFamilyNode.value);

            this.canvas.renderAll();

        },

        _changeColor: function() {
            this.canvas.getActiveObject().setFill(this.textColorNode.value);
            this.canvas.getActiveObject().setStroke(this.textColorNode.value);
            this.canvas.renderAll();

        },

        _changeFontSize: function() {
            this.canvas.getActiveObject().setFontSize(this.textFontSizeNode.value);
            this.canvas.renderAll();

        },

        
      /*  _increaseFont: function() {
            var activeObject = this.canvas.getActiveObject()
            var increment = "5";
            var currFontSize = activeObject.get("fontSize");

            activeObject.setFontSize(+currFontSize + +increment);

            this.canvas.renderAll();

        },
*/

        _deleteObject: function() {
         
            var activeObject = this.canvas.getActiveObject()

            if (activeObject.isCMB) {
                alert("You cannot delete the CMB")
            } else {
                if (confirm('Are you sure?')) {
                    this.canvas.remove(activeObject);
                }
            }
        },

        _drawInteractiveText: function() {
            var itext = new fabric.IText(this.EnterTextMessage, {
                left: this.canvas.getWidth() / 2,
                top: this.canvas.getHeight() / 3,
                fill: '#ffbf05',
                strokeWidth: 2,
                stroke: "#ffbf05",
                originX: 'center',
                originY: 'center',
                borderColor: '#fd5f00',
                cornerColor: '#fd5f00',
                cornerSize: 20,
                rotatingPointOffset: 80,
                transparentCorners: false,
                padding: 7,
            });
            itext.setControlsVisibility({
                tr: false,
                br: false,
                bl: false,
                ml: false,
                mt: false,
                mr: false,
                mb: false,
                mtr: true,
                tl: false
            });
            
            this.canvas.add(itext);
            this.canvas.moveTo(itext,2);
        },

        _drawArrow: function() {

            var triangle = new fabric.Triangle({
                width: 40,
                height: 20,
                left: 235,
                top: 80,
                angle: 90,
                stroke: '#ffbf05',
                fill: '#ffbf05',
                strokeWidth: 0,
                //lockScalingY: true,
                padding: 15,
                //lockScalingX:true
            });

            var line = new fabric.Line([50, 100, 200, 100], {
                left: 75,
                top: 90,
                stroke: '#ffbf05',
                fill: '#ffbf05',
                strokeWidth: 20,
                lockScalingY: true,
                padding: 15,
            });


            var objs = [line, triangle];

            var alltogetherObj = new fabric.Group(objs, {
                left: this.canvas.getWidth() / 2,
                top: this.canvas.getHeight() / 2,
                originX: 'center',
                originY: 'center',
                transparentCorners: false,
                borderColor: '#fd5f00',
                cornerColor: '#fd5f00',
                cornerSize: 20,
                rotatingPointOffset: 80,
                isArrow: true,
                padding: 15,
                // lockScalingX: true,
                // lockScalingY: true
            });
            alltogetherObj.setControlsVisibility({
                tr: false,
                br: false,
                bl: false,
                ml: true,
                mt: false,
                mr: true,
                mb: false,
                mtr: true,
                tl: false
            });
            

            this._drawInteractiveText();
            this.canvas.add(alltogetherObj);
            this.canvas.moveTo(alltogetherObj,1);

        },

        _cancel: function(){
            this.mxform.close();
        },
        /**
         * SAVE TO NEW IMAGE
         *  - save the canvas contents to a new image object
         *  - copy the association from the source image->parent to this new object
         */
        _saveToNewImage: function() {
            this.saveButtonNode.setAttribute("disabled", null);
            this.saveButtonNode.innerText = "Saving..."
            this._getNewImageObject()
                .then(this._copyParentAssociationToNewObject.bind(this))
                .then(this._saveCanvasContentsToImage.bind(this))
                .then(this._executeCompletedMicroflow.bind(this))
                .then(function() {
                    this.saveButtonNode.removeAttribute("disabled");
                    this.saveButtonNode.innerText = "Save";
                }.bind(this));
        },

        /**
         * GetImageObejctGuid
         * ---
         * Returns the image object (either from context or creates one)
         *  
         * @author Conner Charlebois
         * @since Jul 30, 2018
         * @returns newly created MyImage object
         */
        _getNewImageObject: function() {
            return new Promise(lang.hitch(this, function(resolve, reject) {
                // create a new object of this entity
                mx.data.create({
                    entity: this._contextObj.getEntity(),
                    callback: lang.hitch(this, function(obj) {
                        console.log("The object has been created");
                        resolve(obj);
                    }),
                    error: function(e) {
                        reject("there was an error creating this object");
                    },
                });
            }));
        },

        /**
         * @returns MyImage Object with parent association set and the IsAnnotated flag set
         */
        _copyParentAssociationToNewObject: function(object) {
            return new Promise(lang.hitch(this, function(resolve, reject) {
                var associationName = this.pathToParent.split("/")[0];
                // context object exists and is tied to a parent entity

                if (this._contextObj && this._contextObj.get(associationName)) {
                    object.set(associationName, this._contextObj.get(associationName));
                    resolve(object);
                }
                reject("Context object is empty or there is no parent association set");
            }));
        },

        /**
         * @return guid of newly saved object
         */
        _saveCanvasContentsToImage: function(object) {
            return new Promise(lang.hitch(this, function(resolve, reject) {
                this.canvas.deactivateAll().renderAll();
                //msToBlob()
                //toBlob
                this.canvasNode.toBlob(lang.hitch(this, function(blob) {
                    var fname = "img_" + new Date().toISOString().replace(/\W/g, "") + ".jpg";
                    window.mx.data.saveDocument(
                        object.getGuid(), fname, {
                            width: 640,
                            height: 480
                        },
                        blob,
                        lang.hitch(this, function() {
                            console.log("ok");
                            resolve(object.getGuid());
                        }),
                        function(err) {
                            reject("error");
                        });
                }));
            }));

        },

        /**
         * Look at the context object, and draw the right image (based on the mapping in this.imageMapping)
         */
        _drawDefaultCMB: function() {

try{
            var overlays = this._contextObj.jsonData.attributes["DeliveryPlanning.CMBImages_CMBImageOverlay"];
            var num_overlays = overlays.value.length;
            //var url=mx.data.getDocumentUrl(this._contextObj.jsonData.attributes["DeliveryPlanning.CMBImages_CMBImageOverlay"].value[0]);
            
            for (var i = 0; i < num_overlays; i++) { 
                
            var url = mx.data.getDocumentUrl(this._contextObj.jsonData.attributes["DeliveryPlanning.CMBImages_CMBImageOverlay"].value[i]);
        console.log(100*i);

        var left_ = 100*i;
        var top_ = 200*i;

           fabric.Image.fromURL(url, async function(oImg) {
                oImg.set({
                    width: 150,
                    height: 150,
                    left: left_,
                    top: top_,
                    //originX: 'center',
                    //originY: 'center',
                    centeredScaling: true,
                    hasControls: true,
                    lockUniScaling: true,
                    lockScalingFlip: true,
                    transparentCorners: false,
                    borderColor: '#fd5f00',
                    cornerColor: '#fd5f00',
                    cornerSize: 20,
                    rotatingPointOffset: 80,
                    deletable: false,
                    isCMB: true,
                    padding: 7,
                });
               
                /*
                // passing an image with a name that includes transparent will make sure the image
                // doesn't actually get drawn.  hackey.  should be a boolean on the widget
                if (! url.includes('transparent'))
                {
                    this.canvas.moveTo(oImg,0);
                    this.canvas.add(oImg);
                }         
                */
                
                this.canvas.add(oImg);
                this.canvas.renderAll();
              //  this.canvas.moveTo(oImg, 0);
            }.bind(this));
        }
        }
    catch(err){console.log('no cmb to display')}},

        /**
         * execute the specified Microflow, if one exists
         */
        _executeCompletedMicroflow: function(guid) {
            return new Promise(lang.hitch(this, function(resolve, reject) {
                if (this.onUploadComplete) {
                    mx.data.action({
                        params: {
                            actionname: this.onUploadComplete,
                            applyto: "selection",
                            guids: [guid],
                        },
                        origin: this.mxform,
                        callback: resolve,
                        error: reject
                    })
                } else {
                    resolve();
                }

            }))
        }



    });
});

require(["ImageEditor/widget/ImageEditor"]);