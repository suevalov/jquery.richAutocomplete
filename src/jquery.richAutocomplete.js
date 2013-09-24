(function() {
  "use strict";
  var AdditionalMode, IS_MAC, KEY_A, KEY_BACKSPACE, KEY_CMD, KEY_CTRL, KEY_DELETE, KEY_DOWN, KEY_ESC, KEY_RETURN, KEY_SHIFT, KEY_TAB, KEY_UP, MicroEvent, Mode, Plugin, autoGrow, classes, defaults, getSelection, innerHighlight, measureString, pluginName, templates, transferStyles;

  pluginName = "richAutocomplete";

  templates = {
    defaultItemTemplate: '<div class="-highlight"><%= value %></div>',
    inputTemplate: '<div class="-richAutocomplete__input" />',
    optionTemplete: '<div class="-richAutocomplete__option" />',
    listContainer: '<div class="-richAutocomplete__list-container" />',
    placeholder: '<div class="-richAutocomplete__placeholder" />',
    list: '<div class="-richAutocomplete__list" />',
    itemTemplate: '<div class="-richAutocomplete__list-item" />',
    emptyTemplate: '<div class="-richAutocomplete__empty"/>',
    createTemplate: '<div class="-richAutocomplete__create" />',
    wrapperTemplate: '<div class="-richAutocomplete__wrapper"/>',
    groupTemplate: '<div class="-richAutocomplete__item-group"></div>',
    groupHeaderTemplate: '<div class="-richAutocomplete__item-group-header"></div>',
    optionTemplate: '<div class="-richAutocomplete__option"><%= template %></div>',
    optionTemplateWithRemoveBtn: '<div class="-richAutocomplete__option"><%= template %><a href="javascript:void(0)" class="remove" tabindex="-1" title="Remove">×</a></div>'
  };

  classes = {
    createElemClass: "-richAutocomplete__create",
    active: "-active",
    selectedClass: "-richAutocomplete__selected",
    optionClass: "-richAutocomplete__option",
    removeButtonClass: "-richAutocomplete__remove-button",
    focusedClass: "-richAutocomplete__focused",
    listItemClass: "-richAutocomplete__list-item",
    highlightClass: "-highlight",
    multiSelectClass: "-richAutocomplete__multi-select",
    loadingClass: "-richAutocomplete__loading"
  };

  Mode = {
    SINGLE: "single",
    MULTI: "multi"
  };

  AdditionalMode = {
    EMPTY: "empty",
    CREATE: "create",
    NOTHING: "nothing"
  };

  defaults = {
    containerWidth: false,
    initialValue: false,
    provider: false,
    defaultTerm: "label",
    minLength: 1,
    emptyTemplate: "Nothing was found for <i><%= value %></i>",
    createTemplate: "Create <i><%= value %></i>...",
    cache: false,
    highlightResults: true,
    maxViewedCount: 10,
    placeholder: false,
    groups: null,
    render: {},
    /*
        groups: [
          {
            itemTemplate: "some template"
            headerTemplate: "header",
            groupClass: "someClass" 
          }
        ]
    */

    formatSaveData: function(data) {
      return JSON.stringify(data);
    },
    mode: Mode.SINGLE,
    additionalMode: AdditionalMode.EMPTY,
    maxSelectedOptions: 10,
    removeButton: false
  };

  /* Hightlighter*/


  innerHighlight = function(node, pat) {
    var endbit, i, middlebit, middleclone, pos, skip, spannode;
    skip = 0;
    if (node.nodeType === 3) {
      pos = node.data.toUpperCase().indexOf(pat.toUpperCase());
      if (pos >= 0) {
        spannode = document.createElement("span");
        spannode.className = "highlighted";
        middlebit = node.splitText(pos);
        endbit = middlebit.splitText(pat.length);
        middleclone = middlebit.cloneNode(true);
        spannode.appendChild(middleclone);
        middlebit.parentNode.replaceChild(spannode, middlebit);
        skip = 1;
      }
    } else if (node.nodeType === 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
      i = 0;
      while (i < node.childNodes.length) {
        i += innerHighlight(node.childNodes[i], pat);
        ++i;
      }
    }
    return skip;
  };

  /*
  Determines the current selection within a text input control.
  Returns an object containing:
  - start
  - length
  
  @param {object} input
  @returns {object}
  */


  getSelection = function(input) {
    var result, sel, selLen;
    result = {};
    if ("selectionStart" in input) {
      result.start = input.selectionStart;
      result.length = input.selectionEnd - result.start;
    } else if (document.selection) {
      input.focus();
      sel = document.selection.createRange();
      selLen = document.selection.createRange().text.length;
      sel.moveStart("character", -input.value.length);
      result.start = sel.text.length - selLen;
      result.length = selLen;
    }
    return result;
  };

  /*
  Copies CSS properties from one element to another.
  
  @param {object} $from
  @param {object} $to
  @param {array} properties
  */


  transferStyles = function($from, $to, properties) {
    var i, n, styles;
    i = void 0;
    n = void 0;
    styles = {};
    if (properties) {
      i = 0;
      n = properties.length;
      while (i < n) {
        styles[properties[i]] = $from.css(properties[i]);
        i++;
      }
    } else {
      styles = $from.css();
    }
    return $to.css(styles);
  };

  /*
  Measures the width of a string within a parent element (in pixels).
  @param {string} str
  @param {object} $parent
  @returns {int}
  */


  measureString = function(str, $parent) {
    var $test, width;
    $test = $("<test>").css({
      position: "absolute",
      top: -99999,
      left: -99999,
      width: "auto",
      padding: 0,
      whiteSpace: "nowrap"
    }).text(str).appendTo("body");
    transferStyles($parent, $test, ["letterSpacing", "fontSize", "fontFamily", "fontWeight", "textTransform"]);
    width = $test.width();
    $test.remove();
    return width;
  };

  /*
  Sets up an input to grow horizontally as the user types. If the value is changed manually, you can
  trigger the "update" handler to resize: $input.trigger('update');
  @param {object} $input
  */


  autoGrow = function($input) {
    var update;
    update = function(e) {
      var character, keyCode, placeholder, printable, selection, shift, value, width;
      value = void 0;
      keyCode = void 0;
      printable = void 0;
      placeholder = void 0;
      width = void 0;
      shift = void 0;
      character = void 0;
      selection = void 0;
      e = e || window.event || {};
      if (e.metaKey || e.altKey) {
        return;
      }
      if ($input.data("grow") === false) {
        return;
      }
      value = $input.val();
      if (e.type && e.type.toLowerCase() === "keydown") {
        keyCode = e.keyCode;
        printable = (keyCode >= 97 && keyCode <= 122) || (keyCode >= 65 && keyCode <= 90) || (keyCode >= 48 && keyCode <= 57) || keyCode === 32;
        if (keyCode === KEY_DELETE || keyCode === KEY_BACKSPACE) {
          selection = getSelection($input[0]);
          if (selection.length) {
            value = value.substring(0, selection.start) + value.substring(selection.start + selection.length);
          } else if (keyCode === KEY_BACKSPACE && selection.start) {
            value = value.substring(0, selection.start - 1) + value.substring(selection.start + 1);
          } else {
            if (keyCode === KEY_DELETE && typeof selection.start !== "undefined") {
              value = value.substring(0, selection.start) + value.substring(selection.start + 1);
            }
          }
        } else if (printable) {
          shift = e.shiftKey;
          character = String.fromCharCode(e.keyCode);
          if (shift) {
            character = character.toUpperCase();
          } else {
            character = character.toLowerCase();
          }
          value += character;
        }
      }
      placeholder = $input.attr("placeholder") || "";
      if (!value.length && placeholder.length) {
        value = placeholder;
      }
      width = measureString(value, $input) + 4;
      if (width !== $input.width()) {
        $input.width(width);
        return $input.triggerHandler("resize");
      }
    };
    $input.on("keydown keyup update blur", update);
    return update();
  };

  MicroEvent = function() {};

  MicroEvent.prototype = {
    on: function(event, fct) {
      this._events = this._events || {};
      this._events[event] = this._events[event] || [];
      return this._events[event].push(fct);
    },
    off: function(event, fct) {
      var n;
      n = arguments_.length;
      if (n === 0) {
        return delete this._events;
      }
      if (n === 1) {
        return delete this._events[event];
      }
      this._events = this._events || {};
      if (event in this._events === false) {
        return;
      }
      return this._events[event].splice(this._events[event].indexOf(fct), 1);
    },
    trigger: function(event) {
      var i, _results;
      this._events = this._events || {};
      if (event in this._events === false) {
        return;
      }
      i = 0;
      _results = [];
      while (i < this._events[event].length) {
        this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
        _results.push(i++);
      }
      return _results;
    }
  };

  /*
  Mixin will delegate all MicroEvent.js function in the destination object.
  
  - MicroEvent.mixin(Foobar) will make Foobar able to use MicroEvent
  
  @param {object} the object which will support MicroEvent
  */


  MicroEvent.mixin = function(destObject) {
    var i, props, _results;
    props = ["on", "off", "trigger"];
    i = 0;
    _results = [];
    while (i < props.length) {
      destObject.prototype[props[i]] = MicroEvent.prototype[props[i]];
      _results.push(i++);
    }
    return _results;
  };

  IS_MAC = /Mac/.test(navigator.userAgent);

  KEY_A = 65;

  KEY_RETURN = 13;

  KEY_ESC = 27;

  KEY_UP = 38;

  KEY_DOWN = 40;

  KEY_BACKSPACE = 8;

  KEY_DELETE = 46;

  KEY_SHIFT = 16;

  KEY_CMD = IS_MAC ? 91 : 17;

  KEY_CTRL = IS_MAC ? 18 : 17;

  KEY_TAB = 9;

  /* Plugin class*/


  Plugin = (function() {
    Plugin.prototype.element = null;

    Plugin.prototype.options = null;

    Plugin.prototype.context = null;

    Plugin.prototype.cacheStorage = [];

    /*
        Plugin constructor
    */


    function Plugin(element, options) {
      var _this = this;
      this.element = element;
      this.context = this;
      this.options = $.extend({}, defaults, options);
      _.defaults(this.options.render, {
        optionTemplate: function(data) {
          return data[_this.options.defaultTerm];
        },
        itemTemplate: function(data, groupIndex) {
          return _.template(templates.defaultItemTemplate, {
            value: data[_this.options.defaultTerm]
          });
        },
        emptyTemplate: function(searchString) {
          return _.template(_this.options.emptyTemplate, {
            value: searchString
          });
        },
        createTemplate: function(searchString) {
          return _.template(_this.options.createTemplate, {
            value: searchString
          });
        }
      });
      this._defaults = defaults;
      this._name = pluginName;
      this._init();
    }

    /*
        /////////  Events  ///////////
    */


    Plugin.prototype._getPublicApi = function() {
      return {
        element: this.options.element,
        setValue: this.setValue.bind(this),
        clearValue: $.proxy(this.clearValue, this),
        getValue: $.proxy(this.getValue, this),
        moveToNextInList: $.proxy(this.moveToNextInList, this),
        moveToPrevInList: $.proxy(this.moveToPrevInList, this),
        search: $.proxy(this._search.bind, this),
        setProvider: $.proxy(this.setProvider, this)
      };
    };

    /* 
        /////// Public methods ///////////
    */


    Plugin.prototype.setValue = function(data) {
      this._reset();
      this._addValue(data);
      return this.trigger("set", this._getPublicApi());
    };

    Plugin.prototype.addValue = function(data) {
      return this._addValue(data);
    };

    Plugin.prototype.removeValue = function(data) {
      var selectedData,
        _this = this;
      selectedData = this._getSelectedData();
      if (this.options.mode === Mode.SINGLE) {
        if (_.isObject(data)) {
          if (_.isEqual(data, selectedData)) {
            return this._removeValueByIndex(0);
          }
        }
      } else {
        if (_.isObject(data)) {
          data = [data];
        }
        return _.each(selectedData, function(selectedItem, index) {
          return _.each(data, function(item) {
            if (_.isEqual(selectedItem, item)) {
              return _this._removeValueByIndex(index);
            }
          });
        });
      }
    };

    Plugin.prototype.clearValue = function() {
      this._reset();
      return this.trigger("clear", this._getPublicApi());
    };

    Plugin.prototype.getWrapper = function() {
      return this.options.aclist.wrapper;
    };

    Plugin.prototype.setProvider = function(provider) {
      return this.options.provider = provider;
    };

    Plugin.prototype.getValue = function() {
      return this.options.element.data("data");
    };

    Plugin.prototype.moveToNextInList = function() {
      var createElem, newIndex, resultsCount;
      resultsCount = this.options.aclist.currentList.length;
      if (resultsCount > 1 || (this.options.aclist.currentIndex === -1 && resultsCount > 0)) {
        if (this.options.aclist.currentSelectedItem) {
          this.options.aclist.currentSelectedItem.removeClass(classes.active);
        }
        newIndex = this.options.aclist.currentIndex + 1;
        if (newIndex >= resultsCount) {
          newIndex = 0;
        }
        this.options.aclist.currentSelectedItem = this.options.aclist.currentList[newIndex];
        this.options.aclist.currentIndex = newIndex;
        return this.options.aclist.currentSelectedItem.addClass(classes.active);
      } else {
        createElem = this.options.aclist.list.find("." + classes.createElemClass);
        if (createElem.length > 0) {
          this.options.createItemAvailable = true;
          return createElem.addClass(classes.active);
        }
      }
    };

    Plugin.prototype.moveToPrevInList = function() {
      var createElem, newIndex, resultsCount;
      resultsCount = this.options.aclist.currentList.length;
      if (resultsCount > 1 || (this.options.aclist.currentIndex === -1 && resultsCount > 0)) {
        if (this.options.aclist.currentSelectedItem) {
          this.options.aclist.currentSelectedItem.removeClass(classes.active);
        }
        newIndex = this.options.aclist.currentIndex - 1;
        if (newIndex < 0) {
          newIndex = resultsCount - 1;
        }
        this.options.aclist.currentSelectedItem = this.options.aclist.currentList[newIndex];
        this.options.aclist.currentIndex = newIndex;
        return this.options.aclist.currentSelectedItem.addClass(classes.active);
      } else {
        createElem = this.options.aclist.list.find("." + classes.createElemClass);
        if (createElem.length > 0) {
          this.options.createItemAvailable = false;
          createElem.removeClass(classes.active);
          return this.options.typeInput.focus();
        }
      }
    };

    /*
        //////  Private methods  ///////
    */


    Plugin.prototype._reset = function() {
      if (this.options.mode === Mode.SINGLE) {
        this.options.element.data("data", null);
      } else {
        this.options.element.data("data", []);
      }
      this.options.aclist.input.children().not("input").remove();
      if (this._getSelectedData()) {
        this.options.element.val(this.options.formatSaveData(this._getSelectedData()));
      } else {
        this.options.element.val("");
      }
      if (this.options.aclist.wrapper.hasClass(classes.selectedClass)) {
        return this.options.aclist.wrapper.removeClass(classes.selectedClass);
      }
    };

    Plugin.prototype._addValue = function(data) {
      var canAdd, existingData,
        _this = this;
      existingData = this.options.element.data("data");
      if (_.isArray(data)) {
        if (_.isArray(existingData)) {
          canAdd = this.options.maxSelectedOptions - existingData.length;
          if (canAdd > 0) {
            data = _.first(data, canAdd);
            _.each(data, function(item) {
              return _this._addOneItem(item);
            });
          }
        } else {
          if (existingData === null) {
            this._addOneItem(_.first(data));
          }
        }
        return;
      } else if (_.isObject(data)) {
        if (_.isArray(existingData)) {
          if ((this.options.maxSelectedOptions - existingData.length) > 0) {
            this._addOneItem(data);
          }
        } else {
          if (existingData === null) {
            this._addOneItem(data);
          }
        }
      }
      existingData = this.options.element.data("data");
      this.options.element.val(this.options.formatSaveData(existingData)).trigger("change");
      this.options.typeInput.val("");
      return this.options.typeInput.trigger("update");
    };

    Plugin.prototype._addOneItem = function(data) {
      var alreadyExists, existingData, index, option;
      existingData = this.options.element.data("data");
      index = 0;
      if (this.options.mode === Mode.SINGLE) {
        this.options.element.data("data", data);
        existingData = data;
      } else {
        alreadyExists = _.find(existingData, function(item) {
          return _.isEqual(item, data);
        });
        if (alreadyExists) {
          return false;
        }
        index = existingData.length;
        existingData.push(data);
        this.options.element.data("data", existingData);
      }
      if (!this.options.aclist.wrapper.hasClass(classes.selectedClass)) {
        this.options.aclist.wrapper.addClass(classes.selectedClass);
      }
      if (this.options.mode === Mode.MULTI && this.options.removeButton) {
        option = $(_.template(templates.optionTemplateWithRemoveBtn, {
          template: this.options.render.optionTemplate(data)
        }));
      } else {
        option = $(_.template(templates.optionTemplate, {
          template: this.options.render.optionTemplate(data)
        }));
      }
      option.data("data", data);
      option.insertBefore(this.options.typeInput);
      this.trigger("add", this._getPublicApi());
      if (this.options.mode === Mode.SINGLE) {
        return this.trigger("set", this._getPublicApi());
      }
    };

    Plugin.prototype._getSelectedData = function() {
      return this.options.element.data("data");
    };

    Plugin.prototype._getSelectedOptionsCount = function() {
      if (this.options.mode === Mode.SINGLE) {
        if (this.options.element.data("data") === null) {
          return 0;
        } else {
          return 1;
        }
      } else {
        return this.options.element.data("data").length;
      }
    };

    Plugin.prototype._removeValueByIndex = function(index) {
      var selectedData;
      if (this.options.mode === Mode.SINGLE && index === 0) {
        this.trigger("remove", this._getPublicApi());
        return this.clearValue();
      } else {
        selectedData = this._getSelectedData();
        selectedData.splice(index, 1);
        this.options.aclist.input.children().not("input").eq(index).remove();
        this.options.element.data("data", selectedData);
        this.trigger("remove", this._getPublicApi());
        if (selectedData.length === 0) {
          return this.clearValue();
        } else {
          return this.options.element.val(this.options.formatSaveData(selectedData)).trigger("change");
        }
      }
    };

    Plugin.prototype._removeLastOption = function() {
      var selectedData,
        _this = this;
      if (this.options.mode === "single") {
        return this._removeValueByIndex(0);
      } else {
        selectedData = this.options.aclist.input.find("." + classes.optionClass + "." + classes.active);
        if (selectedData.length > 0) {
          return _.each(selectedData, function(item) {
            return _this.removeValue($(item).data("data"));
          });
        } else if (this._getSelectedOptionsCount() > 0) {
          return this._removeValueByIndex(this._getSelectedOptionsCount() - 1);
        }
      }
    };

    Plugin.prototype._init = function() {
      var _this = this;
      this._setSettings();
      this._createElem();
      if (typeof this.options.initialValue === "function") {
        this.options.initialValue().done(function(initialValue) {
          if (initialValue) {
            _this._addValue(initialValue);
          }
          return _this._bindEvents();
        });
        return;
      } else if (typeof this.options.initialValue === "object") {
        if (initialValue) {
          this._addValue(this.options.initialValue);
        }
      }
      if (this.options.mode === Mode.SINGLE) {
        this.options.maxSelectedOptions = 1;
      }
      return this._bindEvents();
    };

    Plugin.prototype._closeContainer = function() {
      this.options.aclist.currentList = [];
      this.options.aclist.currentSelectedItem = null;
      this.options.aclist.currentIndex = -1;
      this.options.aclist.container.hide();
      this.options.aclist.list.empty();
      return this.options.closed = true;
    };

    Plugin.prototype._openContainer = function() {
      this.options.aclist.container.show();
      return this.options.closed = false;
    };

    Plugin.prototype._search = function() {
      var textVal,
        _this = this;
      textVal = this.options.typeInput.val();
      this._openContainer();
      if (this.options.cache && this._haveValuesInCache(textVal)) {
        return this._cacheProvider(this.options.textVal).done(function(response) {
          return _this._onSearchFinish(textVal, response);
        });
      } else {
        this.options.aclist.input.addClass(classes.loadingClass);
        return this.options.provider(textVal).done(function(response) {
          _this.options.aclist.input.removeClass(classes.loadingClass);
          return _this._onSearchFinish(textVal, response);
        });
      }
    };

    Plugin.prototype._onSearchFinish = function(value, response) {
      this.options.aclist.currentList = [];
      this.options.aclist.currentSelectedItem = null;
      this.options.aclist.currentIndex = -1;
      this.options.aclist.list.empty().show();
      if (this.options.cache) {
        this._cacheValues(value, response);
      }
      return this._onLoadList(response, value);
    };

    Plugin.prototype._haveValuesInCache = function(value) {
      if (typeof this.cacheStorage[value] === "undefined") {
        return false;
      }
      return true;
    };

    Plugin.prototype._cacheProvider = function(value) {
      var deferred;
      value = value.toLowerCase();
      deferred = new $.Deferred();
      if (this._haveValuesInCache(value)) {
        return deferred.resolve(this.cacheStorage[value]);
      } else {
        return deferred.reject();
      }
    };

    Plugin.prototype._cacheValues = function(value, data) {
      value = value.toLowerCase();
      return this.cacheStorage[value] = data;
    };

    Plugin.prototype._setSettings = function() {
      this.options.closed = true;
      this.options.canCloseOnBlur = true;
      this.options.currentIndex = 0;
      this.options.closed = true;
      this.options.textVal = "";
      this.options.element = $(this.element);
      this.options.aclist = {};
      this.options.aclist.currentIndex = -1;
      this.options.aclist.currentList = [];
      return this.options.createItemAvailable = false;
    };

    Plugin.prototype._createElem = function() {
      var $element, containerWidth, placeholder;
      $element = this.options.element;
      this.options.aclist.wrapper = $element.wrap(templates.wrapperTemplate).parent();
      this.options.aclist.input = $(templates.inputTemplate).insertBefore($element);
      this.options.typeInput = $("<input type='text' />").appendTo(this.options.aclist.input);
      autoGrow(this.options.typeInput);
      $element.hide();
      this.options.aclist.container = $(templates.listContainer).insertAfter(this.options.aclist.input).hide();
      if (this.options.containerWidth) {
        containerWidth = this.options.containerWidth;
      } else {
        containerWidth = this.options.element.outerWidth() - (this.options.aclist.container.outerWidth() - this.options.aclist.container.width());
      }
      if (!this.options.placeholder) {
        if (this.options.element.attr("placeholder")) {
          this.options.placeholder = this.options.element.attr("placeholder");
        }
      }
      if (this.options.placeholder) {
        placeholder = $(templates.placeholder).text(this.options.placeholder);
        this.options.aclist.placeholder = placeholder;
        this.options.aclist.wrapper.append(placeholder);
      }
      if (this.options.mode === Mode.MULTI) {
        this.options.aclist.input.addClass(classes.multiSelectClass);
        this.options.element.data("data", []);
        if (this.options.removeButton) {
          this.options.aclist.input.addClass(classes.removeButtonClass);
        }
      } else {
        this.options.element.data("data", null);
      }
      this.options.aclist.container.width(containerWidth);
      return this.options.aclist.list = $(templates.list).appendTo(this.options.aclist.container);
    };

    Plugin.prototype._bindEvents = function() {
      var _this = this;
      this.options.aclist.input.on({
        "click.richAutocomplete": function(e) {
          if ($(e.target).hasClass(classes.optionClass)) {
            $(e.target).toggleClass(classes.active);
          } else if ($(e.target).parent().hasClass(classes.optionClass)) {
            _this.removeValue($(e.target).parent().data("data"));
          }
          return _this.options.typeInput.trigger("focus.richAutocomplete");
        }
      });
      this.options.aclist.placeholder.on({
        "click.richAutocomplete": function() {
          return _this.options.typeInput.trigger("focus.richAutocomplete");
        }
      });
      this.options.typeInput.data("timeout", null);
      this.options.typeInput.on("change paste keyup", function(e) {
        clearTimeout(_this.options.typeInput.data("timeout"));
        return _this.options.typeInput.data("timeout", setTimeout(function() {
          var newValue;
          newValue = _this.options.typeInput.val();
          if (newValue.length >= _this.options.minLength) {
            if (_this.options.prevValue !== newValue) {
              _this.options.prevValue = newValue;
              return _this._search();
            }
          } else {
            return _this._closeContainer();
          }
        }, 150));
      });
      this.options.typeInput.on({
        "keydown.richAutocomplete": function(e) {
          var valLength;
          switch (e.which) {
            case KEY_RETURN:
              valLength = _this.options.typeInput.val().length;
              if (valLength >= _this.options.minLength) {
                if (_this.options.aclist.currentSelectedItem) {
                  _this._addValue(_this.options.aclist.currentSelectedItem.data("data"));
                  return _this._closeContainer();
                } else if (_this.options.createItemAvailable) {
                  return _this._createNewItem(_this.options.typeInput.val());
                } else {
                  return _this._search();
                }
              }
              break;
            case KEY_DOWN:
              if (!_this.options.closed) {
                _this.moveToNextInList();
              }
              return false;
            case KEY_UP:
              if (!_this.options.closed) {
                _this.moveToPrevInList();
              }
              return false;
            case KEY_ESC:
              _this.options.typeInput.val("");
              return _this._closeContainer();
            case KEY_BACKSPACE:
              if (_this.options.typeInput.val() === "" && _this._getSelectedOptionsCount() > 0) {
                return _this._removeLastOption();
              }
              break;
            case KEY_TAB:
              _this.options.typeInput.val("");
              break;
            default:
              if (_this._getSelectedOptionsCount() >= _this.options.maxSelectedOptions) {
                e.preventDefault();
                return false;
              }
          }
        },
        "focus.richAutocomplete": function() {
          _this.options.aclist.wrapper.addClass(classes.focusedClass);
          return _this.trigger("focus", _this._getPublicApi());
        },
        "blur.richAutocomplete": function() {
          _this.options.aclist.wrapper.removeClass(classes.focusedClass);
          if (_this.options.canCloseOnBlur) {
            _this.options.typeInput.val("");
            _this._closeContainer();
            return _this.trigger("blur", _this._getPublicApi());
          }
        }
      });
      this.options.aclist.container.off(".richAutocomplete").on({
        "mousedown.richAutocomplete": function() {
          return _this.options.canCloseOnBlur = false;
        },
        "mouseleave.richAutocomplete": function() {
          return _this.options.canCloseOnBlur = true;
        }
      });
      this.options.aclist.container.on("click.richAutocomplete", "." + classes.listItemClass, function(event) {
        var elem;
        elem = $(event.currentTarget);
        _this._addValue(elem.data("data"));
        return _this._closeContainer();
      });
      this.options.aclist.container.on("mouseover.richAutocomplete", "." + classes.listItemClass, function(event) {
        var elem, index;
        elem = $(event.currentTarget);
        elem.addClass(classes.active);
        index = elem.data("index");
        if (_this.options.aclist.currentSelectedItem && _this.options.aclist.currentIndex !== index) {
          _this.options.aclist.currentSelectedItem.removeClass(classes.active);
          _this.options.aclist.currentSelectedItem = elem;
          return _this.options.aclist.currentIndex = index;
        }
      });
      this.options.aclist.container.on("mouseleave.richAutocomplete", "." + classes.listItemClass, function(event) {
        var elem;
        elem = $(event.currentTarget);
        return elem.removeClass(classes.active);
      });
      this.options.aclist.container.on("click.richAutocomplete", "." + classes.createElemClass, function(event) {
        if (_this.options.createItemAvailable) {
          return _this._createNewItem(_this.options.typeInput.val());
        }
      });
      this.options.aclist.container.on("mouseleave.richAutocomplete", "." + classes.createElemClass, function(event) {
        var elem;
        elem = $(event.currentTarget);
        elem.removeClass(classes.active);
        return _this.options.createItemAvailable = false;
      });
      return this.options.aclist.container.on("mouseover.richAutocomplete", "." + classes.createElemClass, function(event) {
        var elem;
        elem = $(event.currentTarget);
        elem.addClass(classes.active);
        return _this.options.createItemAvailable = true;
      });
    };

    Plugin.prototype._onLoadList = function(data, value) {
      var alreadySelected,
        _this = this;
      alreadySelected = this.options.element.data("data");
      data = _.filter(data, function(item) {
        var result;
        result = true;
        _.each(alreadySelected, function(selectedItem) {
          if (_.isEqual(selectedItem, item)) {
            result = false;
          }
        });
        return result;
      });
      this.options.aclist.list.empty();
      this.options.aclist.currentList = [];
      if (data.length > 0) {
        if (_.isArray(data[0])) {
          if (!_.isArray(this.options.groups) || this.options.groups.length !== data.length) {
            throw "For grouped data should be defined groups settings.";
          }
          _.each(data, function(group, index) {
            return _this._createListGroup(group, index);
          });
        } else {
          this._createListGroup(data);
        }
        if (this.options.aclist.currentList.length === 0) {
          if (this.options.additionalMode === AdditionalMode.EMPTY) {
            return this._renderEmptyElem(value);
          } else if (this.options.additionalMode === AdditionalMode.CREATE) {
            return this._renderCreateElem(value);
          }
        } else {
          return this.moveToNextInList();
        }
      } else {
        if (this.options.additionalMode === AdditionalMode.EMPTY) {
          return this._renderEmptyElem(value);
        } else if (this.options.additionalMode === AdditionalMode.CREATE) {
          return this._renderCreateElem(value);
        }
      }
    };

    Plugin.prototype._renderEmptyElem = function(value) {
      var notFoundTemplate;
      return notFoundTemplate = $(templates.emptyTemplate).html(this.options.render.emptyTemplate(value)).appendTo(this.options.aclist.list);
    };

    Plugin.prototype._renderCreateElem = function(value) {
      var createTemplate;
      return createTemplate = $(templates.createTemplate).html(this.options.render.createTemplate(value)).prependTo(this.options.aclist.list);
    };

    Plugin.prototype._createListGroup = function(data, groupIndex) {
      var groupContainer, header, headerContainer, itemTemplate,
        _this = this;
      if (groupIndex == null) {
        groupIndex = -1;
      }
      if (data.length === 0) {
        return;
      }
      itemTemplate = this.options.render.itemTemplate;
      if (groupIndex === -1) {
        itemTemplate = null;
        header = null;
      } else {
        itemTemplate = this.options.groups[groupIndex].itemTemplate;
        header = this.options.groups[groupIndex].headerTemplate;
      }
      if (itemTemplate === null) {
        itemTemplate = this.options.render.itemTemplate;
      }
      groupContainer = $(templates.groupTemplate);
      if (groupIndex !== -1) {
        groupContainer.addClass(this.options.groups[groupIndex].groupClass);
      }
      if (header) {
        headerContainer = $(templates.groupHeaderTemplate).html($(header));
        groupContainer.append(headerContainer);
      }
      if (this.options.maxViewedCount) {
        data = _.first(data, this.options.maxViewedCount);
      }
      _.each(data, function(itemData, index) {
        var listItem;
        listItem = _this._createListItem(itemData, index, itemTemplate, groupContainer);
        return _this.options.aclist.currentList.push(listItem);
      });
      return this.options.aclist.list.append(groupContainer);
    };

    Plugin.prototype._createListItem = function(data, index, template, parent) {
      var elemToHighlight, itemContainer;
      if (typeof template === "function") {
        template = template(data, index);
      }
      itemContainer = $(templates.itemTemplate);
      $(_.template(template, data)).appendTo(itemContainer);
      itemContainer.appendTo(parent);
      itemContainer.data("data", data);
      itemContainer.data("index", index);
      if (this.options.highlightResults) {
        elemToHighlight = itemContainer.find("." + classes.highlightClass);
        if (elemToHighlight.length > 0) {
          innerHighlight(elemToHighlight[0], this.options.typeInput.val());
        }
      }
      return itemContainer;
    };

    Plugin.prototype._createNewItem = function(value) {
      var promise,
        _this = this;
      if (typeof this.options.create === "function") {
        promise = new $.Deferred();
        return this.options.create(value, promise).done(function(item) {
          _this._addValue(item);
          return _this.options.typeInput.val("").focus();
        }).fail(function() {
          return _this.options.typeInput.val("").focus();
        });
      } else {
        throw "Create function should be implemented";
      }
    };

    return Plugin;

  })();

  MicroEvent.mixin(Plugin);

  $.extend({
    richAutocompleteDataProvider: function(data, term, comparator) {
      if (term == null) {
        term = "label";
      }
      if (comparator == null) {
        comparator = null;
      }
      if (!_.isArray(data)) {
        throw "data should be array";
      }
      if (comparator === null) {
        comparator = function(dataItem, value, groupIndex, term) {
          return dataItem[term].toLowerCase().indexOf(value.toLowerCase()) >= 0;
        };
      }
      return function(value) {
        var deferred, result;
        deferred = new $.Deferred();
        if (data.length === 0) {
          return deferred.resolve([]);
        }
        if (_.isArray(data[0])) {
          result = [];
          _.each(data, function(group, groupIndex) {
            return result.push(_.filter(group, function(item) {
              return comparator(item, value, groupIndex, term);
            }));
          });
          return deferred.resolve(result);
        } else {
          result = _.filter(data, function(item) {
            return comparator(item, value, -1, term);
          });
          return deferred.resolve(result);
        }
      };
    }
  });

  $.extend({
    richAutocompleteAjaxProvider: function(url, additionalData, term, type) {
      if (additionalData == null) {
        additionalData = {};
      }
      if (term == null) {
        term = "term";
      }
      if (type == null) {
        type = "get";
      }
      return function(value) {
        var data;
        if (typeof additionalData === "function") {
          additionalData = additionalData();
        }
        data = {};
        data[term] = value;
        return $.ajax({
          type: type,
          url: url,
          dataType: "json",
          data: $.extend({}, data, additionalData)
        });
      };
    }
  });

  $.fn[pluginName] = function(options) {
    var args, methodName, returnVal;
    if (typeof arguments[0] === "string") {
      methodName = arguments[0];
      args = Array.prototype.slice.call(arguments, 1);
      returnVal = null;
      this.each(function() {
        var plugin;
        if ($.data(this, "plugin_" + pluginName) && (typeof $.data(this, "plugin_" + pluginName)[methodName] === "function")) {
          if ((methodName !== "") && (methodName.charAt(0) !== "_")) {
            plugin = $.data(this, "plugin_" + pluginName);
            return returnVal = plugin[methodName].apply(plugin.context, args);
          } else {
            throw new Error("Method " + methodName + " is private method of jQuery." + pluginName);
          }
        } else {
          throw new Error("Method " + methodName + " does not exist on jQuery." + pluginName);
        }
      });
      return returnVal;
    } else if (typeof options === "object" || !options) {
      return this.each(function() {
        if (!$.data(this, "plugin_" + pluginName)) {
          return $.data(this, "plugin_" + pluginName, new Plugin(this, options));
        }
      });
    }
  };

}).call(this);
