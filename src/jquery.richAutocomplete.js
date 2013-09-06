(function() {
  var ListGroup, ListItem, Plugin, defaults, getPubSub, innerHighlight, pluginName, templates;

  pluginName = "richAutocomplete";

  defaults = {
    containderWidth: false,
    initialValue: false,
    onInit: false,
    onClear: false,
    onSet: false,
    onBlur: false,
    onFocus: false,
    provider: false,
    defaultLabelTemplate: '<div class="-label"><%= label %></div>',
    defaultTerm: "label",
    minLength: 1,
    loadingText: "Loading...",
    notFoundText: "Nothing was found",
    showLoading: false,
    highlightResults: true,
    maxViewedCount: false,
    placeholder: false,
    groups: null,
    /*
    
        groups: [
          {
            template: "some template"
            header: "header",
            groupClass: "someClass" 
          }
        ]
    */

    placeholderClass: "-richAutocomplete__placeholder",
    inputClass: "-richAutocomplete__input",
    hiddenInputClass: "-richAutocomplete__hidden-input",
    additionalWrapperClass: "",
    additionalItemClass: ""
  };

  templates = {
    listContainer: '<div class="-richAutocomplete__list-container" />',
    list: '<div class="-richAutocomplete__list" />',
    loadingItem: '<div class="-richAutocomplete__loading" />',
    itemTemplate: '<div class="-richAutocomplete__list-item" />',
    notFoundTemplate: '<div class="-richAutocomplete__not-found" />',
    wrapperTemplate: '<div class="-richAutocomplete__wrapper"/>',
    groupTemplate: '<div class="-richAutocomplete__item-group"></div>',
    groupHeaderTemplate: '<div class="-richAutocomplete__item-group-header"></div>'
  };

  /* Pub/Sub implementation*/


  getPubSub = function() {
    var subUid, topics;
    topics = {};
    subUid = -1;
    return {
      on: function(topic, func) {
        var token;
        if (!topics[topic]) {
          topics[topic] = [];
        }
        token = (++subUid).toString();
        topics[topic].push({
          token: token,
          func: func
        });
        return token;
      },
      trigger: function(topic, args) {
        if (!topics[topic]) {
          return false;
        }
        setTimeout((function() {
          var len, subscribers, _results;
          subscribers = topics[topic];
          len = (subscribers ? subscribers.length : 0);
          _results = [];
          while (len--) {
            _results.push(subscribers[len].func(topic, args));
          }
          return _results;
        }), 0);
        return true;
      },
      off: function(token) {
        var i, j, m;
        for (m in topics) {
          if (topics[m]) {
            i = 0;
            j = topics[m].length;
            while (i < j) {
              if (topics[m][i].token === token) {
                topics[m].splice(i, 1);
                return token;
              }
              i++;
            }
          }
        }
        return false;
      }
    };
  };

  /* Hightlighter*/


  innerHighlight = function(node, pat) {
    var endbit, i, middlebit, middleclone, pos, skip, spannode;
    skip = 0;
    if (node.nodeType === 3) {
      pos = node.data.toUpperCase().indexOf(pat.toUpperCase());
      if (pos >= 0) {
        spannode = document.createElement("span");
        spannode.className = "highlight";
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

  /* Plugin class*/


  Plugin = (function() {
    Plugin.prototype.element = null;

    Plugin.prototype.options = null;

    Plugin.prototype.context = null;

    /*
        Plugin constructor
    */


    function Plugin(element, options) {
      this.element = element;
      this.context = this;
      this.options = $.extend({}, defaults, options);
      this._defaults = defaults;
      this._name = pluginName;
      this._init();
    }

    /*
        /////////  Events  ///////////
    */


    Plugin.prototype._onInit = function() {
      if (this.options.onInit && typeof this.options.onInit === "function") {
        return this.options.onInit(this._getPublicApi());
      }
    };

    Plugin.prototype._onClear = function() {
      if (this.options.onClear && typeof this.options.onClear === "function") {
        return this.options.onClear(this._getPublicApi());
      }
    };

    Plugin.prototype._onSet = function() {
      if (this.options.onSet && typeof this.options.onSet === "function") {
        return this.options.onSet(this._getPublicApi());
      }
    };

    Plugin.prototype._onBlur = function() {
      if (this.options.onBlur && typeof this.options.onBlur === "function") {
        return this.options.onBlur(this._getPublicApi());
      }
    };

    Plugin.prototype._onFocus = function() {
      if (this.options.onFocus && typeof this.options.onFocus === "function") {
        return this.options.onFocus(this._getPublicApi());
      }
    };

    Plugin.prototype._getPublicApi = function() {
      return {
        element: this.options.element,
        selectedItem: this.getSelectedItemElem(),
        setValue: this.setValue.bind(this),
        clearValue: $.proxy(this.clearValue, this),
        getValue: $.proxy(this.getValue, this),
        moveToNextInList: $.proxy(this.moveToNextInList, this),
        moveToPrevInList: $.proxy(this.moveToPrevInList, this),
        search: $.proxy(this._search.bind, this),
        changePlaceholder: $.proxy(this.changePlaceholder, this),
        setProvider: $.proxy(this.setProvider, this)
      };
    };

    /* 
        /////// Public methods ///////////
    */


    Plugin.prototype.setValue = function(data) {
      this._removePlaceholder();
      this.options.hiddenElement.val(JSON.stringify(data)).trigger("change");
      this.options.element.val(data[this.options.defaultTerm]);
      this.options.textVal = data[this.options.defaultTerm];
      this.options.currentData = data;
      return this._onSet();
    };

    Plugin.prototype.changePlaceholder = function(placeholder) {
      this.options.placeholder = placeholder;
      return this._setPlaceholder();
    };

    Plugin.prototype.setProvider = function(provider) {
      return this.options.provider = provider;
    };

    Plugin.prototype.clearValue = function() {
      this.options.textVal = '';
      this.options.hiddenElement.val('').trigger("change");
      this.options.element.val('');
      this.options.currentData = null;
      if (!this.options.element.is(":focus")) {
        this._setPlaceholder();
      }
      return this._onClear();
    };

    Plugin.prototype.getValue = function() {
      return this.options.currentData;
    };

    Plugin.prototype.getSelectedItemElem = function() {
      if (this.options.aclist.currentSelectedItem) {
        return this.options.aclist.currentSelectedItem.element;
      }
      return null;
    };

    Plugin.prototype.moveToNextInList = function() {
      var newIndex, resultsCount;
      resultsCount = this.options.aclist.currentList.length;
      if (resultsCount > 1 || (this.options.aclist.currentIndex === -1 && resultsCount > 0)) {
        if (this.options.aclist.currentSelectedItem) {
          this.options.aclist.currentSelectedItem.deselect();
        }
        newIndex = this.options.aclist.currentIndex + 1;
        if (newIndex >= resultsCount) {
          newIndex = 0;
        }
        this.options.aclist.currentSelectedItem = this.options.aclist.currentList[newIndex];
        this.options.aclist.currentIndex = newIndex;
        return this.options.aclist.currentSelectedItem.select();
      }
    };

    Plugin.prototype.moveToPrevInList = function() {
      var newIndex, resultsCount;
      resultsCount = this.options.aclist.currentList.length;
      if (resultsCount > 1 || (this.options.aclist.currentIndex === -1 && resultsCount > 0)) {
        if (this.options.aclist.currentSelectedItem) {
          this.options.aclist.currentSelectedItem.deselect();
        }
        newIndex = this.options.aclist.currentIndex - 1;
        if (newIndex < 0) {
          newIndex = resultsCount - 1;
        }
        this.options.aclist.currentSelectedItem = this.options.aclist.currentList[newIndex];
        this.options.aclist.currentIndex = newIndex;
        return this.options.aclist.currentSelectedItem.select();
      }
    };

    /*
        //////  Private methods  ///////
    */


    Plugin.prototype._init = function() {
      var _this = this;
      this._setSettings();
      this._createElem();
      if (typeof this.options.initialValue === "function") {
        this.options.initialValue().done(function(initialValue) {
          _this.setValue(initialValue);
          _this._bindEvents();
          return _this._onInit();
        });
        return;
      } else if (typeof this.options.initialValue === "object") {
        this.setValue(this.options.initialValue);
      }
      this._bindEvents();
      return this._onInit();
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

    Plugin.prototype._setPlaceholder = function() {
      if (this.options.placeholder && this.getValue() === null) {
        this.options.element.val(this.options.placeholder);
        return this.options.element.addClass(this.options.placeholderClass);
      }
    };

    Plugin.prototype._removePlaceholder = function() {
      if (this.options.element.hasClass(this.options.placeholderClass)) {
        this.options.element.val("");
        return this.options.element.removeClass(this.options.placeholderClass);
      }
    };

    Plugin.prototype._search = function() {
      var _this = this;
      this.options.textVal = this.options.element.val();
      if (this.options.showLoading) {
        this.options.aclist.list.hide();
        this.options.aclist.loadingItem.html(this.options.loadingText).show();
      }
      this._openContainer();
      return this.options.provider(this.options.textVal).done(function(response) {
        if (_this.options.showLoading) {
          _this.options.aclist.loadingItem.hide();
        }
        _this.options.aclist.currentList = [];
        _this.options.aclist.currentSelectedItem = null;
        _this.options.aclist.currentIndex = -1;
        _this.options.aclist.list.empty().show();
        if (_this.options.textVal === _this.options.element.val()) {
          return _this._onLoadList(response);
        }
      });
    };

    Plugin.prototype._startIntervalCheck = function() {
      var _this = this;
      return this.options.intervalCheck = setInterval(function() {
        var newValue;
        newValue = _this.options.element.val();
        if (newValue.length >= _this.options.minLength) {
          if (_this.options.element.val() !== _this.options.textVal) {
            return _this._search();
          }
        } else if (newValue === "" && _this.options.element.val() !== _this.options.textVal) {
          return _this.clearValue();
        } else {
          return _this._closeContainer();
        }
      }, 400);
    };

    Plugin.prototype._stopIntervalCheck = function() {
      return clearInterval(this.options.intervalCheck);
    };

    Plugin.prototype._setSettings = function() {
      this.options.closed = true;
      this.options.canCloseOnBlur = true;
      this.options.currentIndex = 0;
      this.options.closed = true;
      this.options.currentData = null;
      this.options.textVal = "";
      this.options.element = $(this.element);
      this.options.aclist = {};
      this.options.aclist.currentIndex = -1;
      return this.options.aclist.currentList = [];
    };

    Plugin.prototype._createElem = function() {
      var $element, containerWidth;
      $element = this.options.element;
      this.options.aclist.wrapper = $element.wrap(templates.wrapperTemplate).addClass(this.options.additionalWrapperClass);
      this.options.hiddenElement = $("<input type='hidden' name='" + $element.attr("name") + "' />").val($element.val()).insertAfter($element);
      $element.removeAttr("name").val('');
      this.options.element.addClass(this.options.inputClass);
      this.options.hiddenElement.addClass(this.options.hiddenInputClass);
      this.options.aclist.container = $(templates.listContainer).insertAfter($element).hide();
      containerWidth;
      if (this.options.containerWidth) {
        containerWidth = this.options.containerWidth;
      } else {
        containerWidth = this.options.element.outerWidth() - (this.options.aclist.container.outerWidth() - this.options.aclist.container.width());
      }
      if (!this.options.placeholder) {
        if (this.options.element.attr("placeholder")) {
          this.options.placeholder = this.options.element.attr("placeholder");
          $element.removeAttr("placeholder");
        }
      }
      this.options.aclist.container.width(containerWidth);
      this.options.aclist.list = $(templates.list).appendTo(this.options.aclist.container);
      if (this.options.showLoading) {
        this.options.aclist.loadingItem = $(templates.loadingItem).appendTo(this.options.aclist.container).hide();
      }
      if (this.options.placeholder) {
        return this._setPlaceholder();
      }
    };

    Plugin.prototype._bindEvents = function() {
      var _this = this;
      this.options.element.on({
        "keydown.richAutocomplete": function(e) {
          var valLength;
          switch (e.which) {
            case 13:
              valLength = _this.options.element.val().length;
              if (valLength >= _this.options.minLength) {
                if (_this.options.aclist.currentSelectedItem) {
                  return _this.options.aclist.currentSelectedItem.enter();
                } else {
                  return _this._search();
                }
              }
              break;
            case 40:
              if (!_this.options.closed) {
                _this.moveToNextInList();
              }
              return false;
            case 38:
              if (!_this.options.closed) {
                _this.moveToPrevInList();
              }
              return false;
            case 27:
              if (_this.options.currentData) {
                _this.setValue(_this.options.currentData);
              } else {
                _this.clearValue();
              }
              return _this._closeContainer();
          }
        },
        "focus.richAutocomplete": function() {
          _this._removePlaceholder();
          _this._startIntervalCheck();
          return _this._onFocus();
        },
        "blur.richAutocomplete": function() {
          _this._stopIntervalCheck();
          if (_this.options.canCloseOnBlur) {
            if (_this.options.currentData) {
              _this.setValue(_this.options.currentData);
            } else {
              _this.clearValue();
            }
            _this._closeContainer();
            return _this._onBlur();
          }
        }
      });
      return this.options.aclist.container.off(".richAutocomplete").on({
        "mousedown.richAutocomplete": function() {
          return _this.options.canCloseOnBlur = false;
        },
        "mouseleave.richAutocomplete": function() {
          return _this.options.canCloseOnBlur = true;
        }
      });
    };

    Plugin.prototype._onLoadList = function(data) {
      var currentItem, group, notFoundTemplate,
        _this = this;
      this.options.aclist.list.empty();
      this.options.aclist.currentList = [];
      if (data.length > 0) {
        if (_.isArray(data[0])) {
          if (!_.isArray(this.options.groups) || this.options.groups.length !== data.length) {
            throw "For grouped data should be defined groups settings.";
          }
          _.each(data, function(group, index) {
            group = new ListGroup(group, _this, index);
            return group.render();
          });
        } else {
          group = new ListGroup(data, this);
          group.render();
        }
        if (this.options.aclist.currentList.length === 0) {
          return notFoundTemplate = $(templates.notFoundTemplate).html(this.options.notFoundText).appendTo(this.options.aclist.list);
        } else if (this.options.currentData) {
          currentItem = _.first(_.filter(this.options.aclist.currentList, function(listItem) {
            return _.isEqual(listItem.data, _this.options.currentData);
          }));
          this.options.aclist.currentSelectedItem = currentItem;
          this.options.aclist.currentIndex = _.indexOf(this.options.aclist.currentList, currentItem);
          return currentItem.select();
        }
      } else {
        return notFoundTemplate = $(templates.notFoundTemplate).html(this.options.notFoundText).appendTo(this.options.aclist.list);
      }
    };

    return Plugin;

  })();

  ListGroup = (function() {
    function ListGroup(data, plugin, groupIndex) {
      this.data = data;
      this.plugin = plugin;
      this.groupIndex = groupIndex != null ? groupIndex : -1;
      this.options = this.plugin.options;
    }

    ListGroup.prototype.render = function() {
      var groupContainer, header, headerContainer, itemTemplate,
        _this = this;
      if (this.data.length === 0) {
        return;
      }
      if (this.groupIndex === -1) {
        itemTemplate = this.options.defaultLabelTemplate;
        header = null;
      } else {
        itemTemplate = this.options.groups[this.groupIndex].template;
        header = this.options.groups[this.groupIndex].header;
      }
      groupContainer = $(templates.groupTemplate);
      if (this.groupIndex !== -1) {
        groupContainer.addClass(this.options.groups[this.groupIndex].groupClass);
      }
      if (header) {
        headerContainer = $(templates.groupHeaderTemplate).html($(header));
        groupContainer.append(headerContainer);
      }
      if (this.options.maxViewedCount) {
        this.data = _.first(this.data, this.options.maxViewedCount);
      }
      _.each(this.data, function(itemData, index) {
        var listItem;
        listItem = new ListItem(itemData, index, _this.options, itemTemplate, groupContainer);
        listItem.on("click.richAutocomplete", function(event, item) {
          _this.plugin.setValue(item.data);
          return _this.plugin._closeContainer();
        });
        listItem.on("mouseover.richAutocomplete", function(event, item) {
          if (_this.options.aclist.currentSelectedItem && _this.options.aclist.currentIndex !== item.index) {
            _this.options.aclist.currentSelectedItem.deselect();
          }
          _this.options.aclist.currentSelectedItem = item;
          return _this.options.aclist.currentIndex = item.index;
        });
        listItem.render();
        return _this.options.aclist.currentList.push(listItem);
      });
      return this.options.aclist.list.append(groupContainer);
    };

    return ListGroup;

  })();

  ListItem = (function() {
    function ListItem(data, index, options, template, parent) {
      this.data = data;
      this.index = index;
      this.options = options;
      this.template = template;
      this.parent = parent;
      _.extend(this, getPubSub());
    }

    ListItem.prototype.render = function() {
      var itemContainer, template;
      if (typeof this.template === "function") {
        template = this.template(this.data, this.index);
      } else {
        template = this.template;
      }
      itemContainer = $(templates.itemTemplate).addClass(this.options.additionalItemClass);
      $(_.template(template, this.data)).appendTo(itemContainer);
      itemContainer.appendTo(this.parent);
      this.element = itemContainer;
      if (this.options.highlightResults) {
        innerHighlight(this.element.find(".-label")[0], this.options.element.val());
      }
      this._bindEvents();
      return this;
    };

    ListItem.prototype._bindEvents = function() {
      var _this = this;
      this.element.on("click.richAutocomplete", function() {
        return _this.trigger("click.richAutocomplete", _this);
      });
      this.element.on("mouseover.richAutocomplete", function() {
        _this.select();
        return _this.trigger("mouseover.richAutocomplete", _this);
      });
      return this.element.on("mouseleave.richAutocomplete", function() {
        return _this.deselect();
      });
    };

    ListItem.prototype.select = function() {
      return this.element.addClass("active");
    };

    ListItem.prototype.deselect = function() {
      return this.element.removeClass("active");
    };

    ListItem.prototype.enter = function() {
      return this.trigger("click.richAutocomplete", this);
    };

    return ListItem;

  })();

  $.extend({
    richAutocompleteDataProvider: function(data, comparator) {
      if (comparator == null) {
        comparator = null;
      }
      if (!_.isArray(data)) {
        throw "data should be array";
      }
      if (comparator === null) {
        comparator = function(dataItem, value, groupIndex, term) {
          if (term == null) {
            term = "label";
          }
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
              return comparator(item, value, groupIndex);
            }));
          });
          return deferred.resolve(result);
        } else {
          result = _.filter(data, function(item) {
            return comparator(item, value, -1);
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

  $.extend({
    richAutocompleteAjaxWithCacheProvider: function(url, additionalData, term, type) {
      var cache;
      if (additionalData == null) {
        additionalData = {};
      }
      if (term == null) {
        term = "term";
      }
      if (type == null) {
        type = "get";
      }
      cache = [];
      return function(value) {
        var deferred;
        console.log(cache);
        deferred = new $.Deferred();
        if (cache[value]) {
          deferred.resolve(cache[value]);
        } else {
          $.richAutocompleteAjaxProvider(url, additionalData, term, type)(value).done(function(response) {
            if (!cache[value]) {
              cache[value] = response;
            }
            return deferred.resolve(response);
          }).fail(function(response) {
            return deferred.reject(response);
          });
        }
        return deferred.promise();
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
      if (returnVal !== null) {
        return returnVal;
      } else {
        return this;
      }
    } else if (typeof options === "object" || !options) {
      return this.each(function() {
        if (!$.data(this, "plugin_" + pluginName)) {
          return $.data(this, "plugin_" + pluginName, new Plugin(this, options));
        }
      });
    }
  };

}).call(this);
