
"use strict"

pluginName = "richAutocomplete"

templates = 
	defaultItemTemplate: '<div class="-highlight"><%= value %></div>'
	inputTemplate: '<div class="-richAutocomplete__input" />'
	optionTemplete: '<div class="-richAutocomplete__option" />'
	listContainer: '<div class="-richAutocomplete__list-container" />'
	placeholder: '<div class="-richAutocomplete__placeholder" />'
	list: '<div class="-richAutocomplete__list" />'
	itemTemplate: '<div class="-richAutocomplete__list-item" />'
	emptyTemplate: '<div class="-richAutocomplete__empty"/>'
	createTemplate: '<div class="-richAutocomplete__create" />'
	wrapperTemplate: '<div class="-richAutocomplete__wrapper"/>'
	groupTemplate: '<div class="-richAutocomplete__item-group"></div>'
	groupHeaderTemplate: '<div class="-richAutocomplete__item-group-header"></div>'
	optionTemplate: '<div class="-richAutocomplete__option"><%= template %></div>'
	optionTemplateWithRemoveBtn: '<div class="-richAutocomplete__option"><%= template %><a href="javascript:void(0)" class="remove" tabindex="-1" title="Remove">×</a></div>'

classes = 
	createElemClass: "-richAutocomplete__create"
	active: "-active"
	selectedClass : "-richAutocomplete__selected"
	optionClass : "-richAutocomplete__option"
	removeButtonClass : "-richAutocomplete__remove-button"
	focusedClass : "-richAutocomplete__focused"
	listItemClass: "-richAutocomplete__list-item"
	highlightClass: "-highlight"
	multiSelectClass: "-richAutocomplete__multi-select"
	loadingClass: "-richAutocomplete__loading"
	hasItems: "-has-items"

Mode =
	SINGLE: "single"
	MULTI : "multi"

AdditionalMode =
	EMPTY: "empty"
	CREATE: "create"
	NOTHING: "nothing"

defaults =

	containerWidth: false
	initialValue: false

	provider: false

	defaultTerm: "label"
	minLength: 1

	emptyTemplate: "Nothing was found for <i><%= value %></i>"
	createTemplate: "Create <i><%= value %></i>..."

	cache: false
	cacheLimit: 20
	highlightResults: true
	maxViewedCount: 10
	placeholder: false
	
	groups: null
	render: {}

	###
		groups: [
			{
				itemTemplate: "some template"
				headerTemplate: "header",
				groupClass: "someClass"	
			}
		]
	###

	formatSaveData: (data) ->
		JSON.stringify(data)
	
	mode: Mode.SINGLE
	additionalMode: AdditionalMode.EMPTY
	maxSelectedOptions: false
	removeButton: false


### Hightlighter ###

innerHighlight = (node, pat) ->
	skip = 0
	if node.nodeType is 3
		pos = node.data.toUpperCase().indexOf(pat.toUpperCase())
		if pos >= 0
			spannode = document.createElement("span")
			spannode.className = "highlighted"
			middlebit = node.splitText(pos)
			endbit = middlebit.splitText(pat.length)
			middleclone = middlebit.cloneNode(true)
			spannode.appendChild middleclone
			middlebit.parentNode.replaceChild spannode, middlebit
			skip = 1
	else if node.nodeType is 1 and node.childNodes and not /(script|style)/i.test(node.tagName)
		i = 0

		while i < node.childNodes.length
			i += innerHighlight(node.childNodes[i], pat)
			++i
	skip

###
Determines the current selection within a text input control.
Returns an object containing:
- start
- length

@param {object} input
@returns {object}
###
getSelection = (input) ->
  result = {}
  if "selectionStart" of input
    result.start = input.selectionStart
    result.length = input.selectionEnd - result.start
  else if document.selection
    input.focus()
    sel = document.selection.createRange()
    selLen = document.selection.createRange().text.length
    sel.moveStart "character", -input.value.length
    result.start = sel.text.length - selLen
    result.length = selLen
  result

###
Copies CSS properties from one element to another.

@param {object} $from
@param {object} $to
@param {array} properties
###
transferStyles = ($from, $to, properties) ->
  i = undefined
  n = undefined
  styles = {}
  if properties
    i = 0
    n = properties.length

    while i < n
      styles[properties[i]] = $from.css(properties[i])
      i++
  else
    styles = $from.css()
  $to.css styles

###
Measures the width of a string within a parent element (in pixels).
@param {string} str
@param {object} $parent
@returns {int}
###
measureString = (str, $parent) ->
  $test = $("<test>").css(
    position: "absolute"
    top: -99999
    left: -99999
    width: "auto"
    padding: 0
    whiteSpace: "nowrap"
  ).text(str).appendTo("body")
  transferStyles $parent, $test, ["letterSpacing", "fontSize", "fontFamily", "fontWeight", "textTransform"]
  width = $test.width()
  $test.remove()
  width


###
Sets up an input to grow horizontally as the user types. If the value is changed manually, you can
trigger the "update" handler to resize: $input.trigger('update');
@param {object} $input
###
autoGrow = ($input) ->
  update = (e) ->
    value = undefined
    keyCode = undefined
    printable = undefined
    placeholder = undefined
    width = undefined
    shift = undefined
    character = undefined
    selection = undefined
    e = e or window.event or {}
    return  if e.metaKey or e.altKey
    return  if $input.data("grow") is false
    value = $input.val()
    if e.type and e.type.toLowerCase() is "keydown"
      keyCode = e.keyCode
      # a-z
      # A-Z
      # 0-9
      printable = ((keyCode >= 97 and keyCode <= 122) or (keyCode >= 65 and keyCode <= 90) or (keyCode >= 48 and keyCode <= 57) or keyCode is 32) # space
      if keyCode is KEY_DELETE or keyCode is KEY_BACKSPACE
        selection = getSelection($input[0])
        if selection.length
          value = value.substring(0, selection.start) + value.substring(selection.start + selection.length)
        else if keyCode is KEY_BACKSPACE and selection.start
          value = value.substring(0, selection.start - 1) + value.substring(selection.start + 1)
        else value = value.substring(0, selection.start) + value.substring(selection.start + 1)  if keyCode is KEY_DELETE and typeof selection.start isnt "undefined"
      else if printable
        shift = e.shiftKey
        character = String.fromCharCode(e.keyCode)
        if shift
          character = character.toUpperCase()
        else
          character = character.toLowerCase()
        value += character
    placeholder = $input.attr("placeholder") or ""
    value = placeholder  if not value.length and placeholder.length
    width = measureString(value, $input) + 4
    if width isnt $input.width()
      $input.width width
      $input.triggerHandler "resize"

  $input.on "keydown keyup update blur", update
  update()

MicroEvent = ->

MicroEvent:: =
  on: (event, fct) ->
    @_events = @_events or {}
    @_events[event] = @_events[event] or []
    @_events[event].push fct

  off: (event, fct) ->
    n = arguments_.length
    return delete @_events  if n is 0
    return delete @_events[event]  if n is 1
    @_events = @_events or {}
    return  if event of @_events is false
    @_events[event].splice @_events[event].indexOf(fct), 1

  trigger: (event) -> # , args...
    @_events = @_events or {}
    return  if event of @_events is false
    i = 0

    while i < @_events[event].length
      @_events[event][i].apply this, Array::slice.call(arguments, 1)
      i++

###
Mixin will delegate all MicroEvent.js function in the destination object.

- MicroEvent.mixin(Foobar) will make Foobar able to use MicroEvent

@param {object} the object which will support MicroEvent
###
MicroEvent.mixin = (destObject) ->
  props = ["on", "off", "trigger"]
  i = 0

  while i < props.length
    destObject::[props[i]] = MicroEvent::[props[i]]
    i++


KEY_RETURN    = 13
KEY_ESC       = 27
KEY_UP        = 38
KEY_DOWN      = 40
KEY_BACKSPACE = 8
KEY_DELETE    = 46
KEY_TAB       = 9
	  
### Plugin class ###

class Plugin

	element: null,
	options: null,
	context: null,
	requestCache: null,

	###
		Plugin constructor
	###
	constructor: (@element, options) ->
		@context = @
		@options = $.extend({}, defaults, options)
		_.defaults(@options.render, {
			optionTemplate: (data) =>
				data[@options.defaultTerm]
			itemTemplate: (data, groupIndex) =>
				_.template(templates.defaultItemTemplate, {
					value: data[@options.defaultTerm]
				})
			emptyTemplate: (searchString) =>
				_.template(@options.emptyTemplate, {
					value: searchString
				});
			createTemplate: (searchString) =>
				_.template(@options.createTemplate, {
					value: searchString
				});
		})
		@_defaults = defaults
		@_name = pluginName
		@_init()

	###
		Initialize plugin
	###
	_init: ->
		@_setSettings()
		@_createElem()
		@_setInitialValue()
		@_initializeRequestCache()
		@_bindEvents()

	_setSettings: ->
		@options.closed = true
		@options.canCloseOnBlur = true
		@options.currentIndex = 0
		@options.prevValue = ""
		@options.element = $(@element)
		@options.aclist = {}
		@options.aclist.currentIndex = -1
		@options.aclist.currentList = []
		@options.createItemAvailable = false
		if @options.mode is Mode.SINGLE
			@options.maxSelectedOptions = 1

	_setInitialValue: ->
		if typeof @options.initialValue is "function"
			@options.initialValue().done((initialValue) =>
				if initialValue
					@_addValue(initialValue)
				@_bindEvents()
			)
			return
		else if typeof @options.initialValue is "object"
			if initialValue
				@_addValue(@options.initialValue)

	_createElem: ->
		$element = @options.element

		@options.aclist.wrapper = $element.wrap(templates.wrapperTemplate).parent()
		@options.aclist.input = $(templates.inputTemplate).insertBefore($element)
		@options.typeInput = $("<input type='text' />").appendTo(@options.aclist.input)
		autoGrow(@options.typeInput)

		# create hidden input below current
		$element.hide();

		@options.aclist.container = $(templates.listContainer).insertAfter(@options.aclist.input).hide()

		if @options.containerWidth
			containerWidth = @options.containerWidth
		else
			containerWidth = @options.element.outerWidth() - (@options.aclist.container.outerWidth() - @options.aclist.container.width())

		if !@options.placeholder
			if @options.element.attr("placeholder")
				@options.placeholder = @options.element.attr("placeholder")

		if @options.placeholder
			placeholder = $(templates.placeholder).text(@options.placeholder);
			@options.aclist.placeholder = placeholder
			@options.aclist.wrapper.append(placeholder)

		if @options.mode is Mode.MULTI
			@options.aclist.input.addClass(classes.multiSelectClass)
			@options.element.data("data", [])

			if @options.removeButton
				@options.aclist.input.addClass(classes.removeButtonClass)
		else
			@options.element.data("data", null)

		@options.aclist.container.width(containerWidth)

		@options.aclist.list = $(templates.list).appendTo(@options.aclist.container)


	_bindEvents: ->

		@options.aclist.input.on(
			"click.richAutocomplete" : (e) =>
				if $(e.target).hasClass(classes.optionClass)
					$(e.target).toggleClass(classes.active)
				else if $(e.target).parent().hasClass(classes.optionClass)
					@removeValue($(e.target).parent().data("data"))
				@options.typeInput.trigger("focus.richAutocomplete")
		)

		@options.aclist.placeholder.on(
			"click.richAutocomplete" : =>
				@options.typeInput.trigger("focus.richAutocomplete")
		)

		@options.typeInput.on(
			"keydown.richAutocomplete": (e) =>
				switch e.which
					when KEY_RETURN
						value = @options.typeInput.val()
						valLength = value.length
						if valLength >= @options.minLength
							if @options.aclist.currentSelectedItem
								@_addValue(@options.aclist.currentSelectedItem.data("data"))
								@_closeContainer()
							else if @options.createItemAvailable
								@_createNewItem(@options.typeInput.val())
							else
								@_search(value)
					when KEY_DOWN
						@moveToNextInList() unless @options.closed
						false
					when KEY_UP
						@moveToPrevInList() unless @options.closed
						false
					when KEY_ESC
						@options.typeInput.val("")
						@_closeContainer()
					when KEY_BACKSPACE
						if @options.typeInput.val() is "" and @_getSelectedOptionsCount() > 0
							@_removeLastOption()
					when KEY_TAB
						@options.typeInput.val("")
						return
					else
						if @options.maxSelectedOptions and @_getSelectedOptionsCount() >= @options.maxSelectedOptions
							e.preventDefault();
							return false

			"keyup.richAutocomplete": =>
				value = @options.typeInput.val() || ""
				if value.length >= @options.minLength
					if @options.prevValue isnt value
						@options.prevValue = value
						@_search(value)
				else
					@_closeContainer()
				@trigger("type")

			"focus.richAutocomplete": =>
				@options.aclist.wrapper.addClass(classes.focusedClass)
				@trigger("focus")

			"blur.richAutocomplete" : =>
				@options.aclist.wrapper.removeClass(classes.focusedClass)
				# if we can close container
				if @options.canCloseOnBlur
					@options.typeInput.val("")
					@_closeContainer()
					@trigger("blur")

		)

		@options.aclist.container.off(".richAutocomplete").on(
			"mousedown.richAutocomplete": =>
				@options.canCloseOnBlur = false
			"mouseleave.richAutocomplete": =>
				@options.canCloseOnBlur = true
		)

		@options.aclist.container.on("click.richAutocomplete", "." + classes.listItemClass, (event) =>
			elem = $(event.currentTarget)
			@_addValue(elem.data("data"))
			@_closeContainer()
		)
		@options.aclist.container.on("mouseover.richAutocomplete", "." + classes.listItemClass, (event) =>
			elem = $(event.currentTarget)
			elem.addClass(classes.active)
			index = elem.data("index")
			if @options.aclist.currentSelectedItem && @options.aclist.currentIndex isnt index
				@options.aclist.currentSelectedItem.removeClass(classes.active)
		 	@options.aclist.currentSelectedItem = elem
		 	@options.aclist.currentIndex = index
		)
		@options.aclist.container.on("mouseleave.richAutocomplete", "." + classes.listItemClass, (event) =>
			elem = $(event.currentTarget)
			elem.removeClass(classes.active)
		)
		@options.aclist.container.on("click.richAutocomplete", "." + classes.createElemClass, (event) =>
			if @options.createItemAvailable
				@_createNewItem(@options.typeInput.val())
		)
		@options.aclist.container.on("mouseleave.richAutocomplete", "." + classes.createElemClass, (event) =>
			elem = $(event.currentTarget)
			elem.removeClass(classes.active)
			@options.createItemAvailable = false
		)
		@options.aclist.container.on("mouseover.richAutocomplete", "." + classes.createElemClass, (event) =>
			elem = $(event.currentTarget)
			elem.addClass(classes.active)
			@options.createItemAvailable = true
		)

	_initializeRequestCache: ->
		cacheLimit = @options.cacheLimit
		@requestCache = (->

			sizeLimit = cacheLimit
			cache = {}
			cachedKeysByAge = []

			get: (value) ->
				cache[value]

			set: (value, data) ->
				if (cachedKeysByAge.length is sizeLimit)
					requestToEvict = cachedKeysByAge.shift()
					delete cache[requestToEvict]
				cache[value] = data
				cachedKeysByAge.push(value)

			have: (key) ->
				_.has(cache, key)

		)()


	### 
		/////// Public methods /////////// 
	###

	setValue: (data) ->
		@_reset()
		@addValue(data)
		@trigger("set", data)

	addValue: (data) ->
		@_addValue(data)

	removeValue: (data) ->
		selectedData = @getValue()
		if @options.mode is Mode.SINGLE
			if _.isObject(data)
				if _.isEqual(data, selectedData)
					@_removeValueByIndex(0)
		else
			if _.isObject(data)
				data = [ data ]
			_.each(selectedData, (selectedItem, index) =>
				_.each(data, (item) =>
					if _.isEqual(selectedItem, item)
						@_removeValueByIndex(index)
				)
			)

	clearValue: ->
		@_reset()
		@trigger("clear")

	getWrapper: ->
		@options.aclist.wrapper

	setProvider: (provider) ->
		@options.provider = provider

	getValue: ->
		return @options.element.data("data")

	moveToNextInList: ->
		resultsCount = @options.aclist.currentList.length
		if resultsCount > 1 or (@options.aclist.currentIndex is -1 and resultsCount > 0)
			if @options.aclist.currentSelectedItem
				@options.aclist.currentSelectedItem.removeClass(classes.active)
			newIndex = @options.aclist.currentIndex + 1
			if newIndex >= resultsCount
				newIndex = 0
			@options.aclist.currentSelectedItem = @options.aclist.currentList[newIndex]
			@options.aclist.currentIndex = newIndex
			@options.aclist.currentSelectedItem.addClass(classes.active)
		else
			createElem = @options.aclist.list.find("." + classes.createElemClass)
			if createElem.length > 0
				@options.createItemAvailable = true
				createElem.addClass(classes.active)


	moveToPrevInList: ->
		resultsCount = @options.aclist.currentList.length
		if resultsCount > 1 or (@options.aclist.currentIndex is -1 and resultsCount > 0)
			if @options.aclist.currentSelectedItem
				@options.aclist.currentSelectedItem.removeClass(classes.active)
			newIndex = @options.aclist.currentIndex - 1
			if newIndex < 0
				newIndex = resultsCount - 1
			@options.aclist.currentSelectedItem = @options.aclist.currentList[newIndex]
			@options.aclist.currentIndex = newIndex
			@options.aclist.currentSelectedItem.addClass(classes.active)
		else
			createElem = @options.aclist.list.find("." + classes.createElemClass)
			if createElem.length > 0
				@options.createItemAvailable = false
				createElem.removeClass(classes.active)
				@options.typeInput.focus()


	###
		//////  Private methods  ///////
	###

	_reset: ->
		if @options.mode is Mode.SINGLE
			@options.element.data("data", null)
		else
			@options.element.data("data", [])
		@options.aclist.input.children().not("input").remove()
		@options.aclist.input.removeClass(classes.hasItems)
		@options.prevValue = ""
		if @getValue()
			@options.element.val(@options.formatSaveData(@getValue()))
		else
			@options.element.val("")
		if @options.aclist.wrapper.hasClass(classes.selectedClass)
			@options.aclist.wrapper.removeClass(classes.selectedClass)

	_addValue: (data) ->
		existingData = @getValue()
		if _.isArray(data)
			if _.isArray(existingData)
				if @options.maxSelectedOptions
					canAdd = @options.maxSelectedOptions - existingData.length
					if canAdd > 0
						data = _.first(data, canAdd)
						_.each(data, (item) =>
							@_addOneItem(item)
						)
				else
					_.each(data, (item) =>
						@_addOneItem(item)
					)
			else
				if existingData is null
					@_addOneItem(_.first(data))
			return
		else if _.isObject(data)
			if _.isArray(existingData)
				if @options.maxSelectedOptions
					if (@options.maxSelectedOptions - existingData.length) > 0
						@_addOneItem(data)
				else
					@_addOneItem(data)
			else
				if existingData is null
					@_addOneItem(data)
		existingData = @getValue()
		@options.element.val(@options.formatSaveData(existingData)).trigger("change")
		@options.typeInput.val("")
		@options.typeInput.trigger("update")

	_addOneItem: (data) ->
		existingData = @getValue()
		index = 0
		if @options.mode is Mode.SINGLE
			@options.element.data("data", data)
			existingData = data
		else
			alreadyExists = _.find(existingData, (item) ->
				_.isEqual(item, data)
			)
			if alreadyExists
				return false
			index = existingData.length
			existingData.push(data)
			@options.element.data("data", existingData)
		unless @options.aclist.wrapper.hasClass(classes.selectedClass)
			@options.aclist.wrapper.addClass(classes.selectedClass)
		if @options.mode is Mode.MULTI and @options.removeButton
			option = $(_.template(templates.optionTemplateWithRemoveBtn, {
				template: @options.render.optionTemplate(data)
			}))
		else
			option = $(_.template(templates.optionTemplate, {
				template: @options.render.optionTemplate(data)
			}))
		option.data("data", data)
		option.insertBefore(@options.typeInput)
		@trigger("add", data)
		if @options.mode is Mode.MULTI
			@options.aclist.input.addClass(classes.hasItems)


	_getSelectedOptionsCount: ->
		if @options.mode is Mode.SINGLE
			if @getValue() is null
				return 0
			else
				return 1
		else
			return @getValue().length

	_removeValueByIndex: (index) ->
		if @options.mode is Mode.SINGLE and index is 0
			@trigger("remove", @getValue())
			@clearValue()
		else
			selectedData = @getValue()
			selectedData.splice(index, 1)
			@options.aclist.input.children().not("input").eq(index).remove()
			@options.element.data("data", selectedData)
			@trigger("remove", selectedData)
			if selectedData.length is 0
				@clearValue()
			else
				@options.element.val(@options.formatSaveData(selectedData)).trigger("change")

	_removeLastOption: ->
		if @options.mode is "single"
			@_removeValueByIndex(0)
		else				
			selectedData = @options.aclist.input.find("." + classes.optionClass + "." + classes.active) 
			if selectedData.length > 0
				_.each(selectedData, (item) =>
					@removeValue($(item).data("data"))
				)
			else if @_getSelectedOptionsCount() > 0
				@_removeValueByIndex(@_getSelectedOptionsCount() - 1)
		@options.typeInput.val("")
		@options.prevValue = ""

	_closeContainer: ->
		@options.aclist.currentList = []
		@options.aclist.currentSelectedItem = null
		@options.aclist.currentIndex = -1
		@options.aclist.container.hide()
		@options.aclist.list.empty()
		@options.closed = true

	_openContainer: ->
		@options.aclist.container.show()
		@options.closed = false

	_search: (value) ->
		if @options.cache && @requestCache.have(value)
			@_cacheProvider(value).done((response) =>
				@_onSearchFinish(value, response)
			)
		else
			@options.aclist.input.addClass(classes.loadingClass)
			@options.provider(value).done((response) =>
				@options.aclist.input.removeClass(classes.loadingClass)
				@_onSearchFinish(value, response)
			)

	_onSearchFinish: (value, response) ->
		@options.aclist.currentList = []
		@options.aclist.currentSelectedItem = null
		@options.aclist.currentIndex = -1
		@options.aclist.list.empty().show()
		if @options.cache
			@_cacheValues(value, response)
		@_onLoadList(response, value)

	_haveValuesInCache: (value) ->
		if typeof @cacheStorage[value] is "undefined"
			return false
		return true

	_cacheProvider: (value) ->
		value = value.toLowerCase()
		deferred = new $.Deferred()
		result = @requestCache.get(value)
		if result
			deferred.resolve(result)
		else
			deferred.reject()

	_cacheValues: (value, data) ->
		value = value.toLowerCase()
		@requestCache.set(value, data)

	_onLoadList: (data, value) ->
		alreadySelected = @getValue()
		data = _.filter(data, (item) ->
			result = true
			_.each(alreadySelected, (selectedItem) ->
				if _.isEqual(selectedItem, item)
					result = false
					return
			)
			return result
		)
		@options.aclist.list.empty()
		@options.aclist.currentList = []
		if (data.length > 0)
			if _.isArray(data[0])
				if !_.isArray(@options.groups) or @options.groups.length isnt data.length
					throw "For grouped data should be defined groups settings."
				_.each(data, (group, index) =>
					@_createListGroup(group, index)
				)
			else
				@_createListGroup(data)
			if @options.aclist.currentList.length is 0
				if @options.additionalMode is AdditionalMode.EMPTY
					@_renderEmptyElem(value)
				else if @options.additionalMode is AdditionalMode.CREATE
					@_renderCreateElem(value)
			else
				@moveToNextInList()
		else
			if @options.additionalMode is AdditionalMode.EMPTY
				@_renderEmptyElem(value)
			else if @options.additionalMode is AdditionalMode.CREATE
				@_renderCreateElem(value)
		@_openContainer()

	_renderEmptyElem: (value) ->
		notFoundTemplate = $(templates.emptyTemplate).html(@options.render.emptyTemplate(value)).appendTo(@options.aclist.list)

	_renderCreateElem: (value) ->	
		createTemplate = $(templates.createTemplate).html(@options.render.createTemplate(value)).prependTo(@options.aclist.list)

	_createListGroup: (data, groupIndex = -1) ->
		if data.length is 0
			return
		itemTemplate = @options.render.itemTemplate
		if groupIndex is -1
			itemTemplate = null
			header = null
		else
			itemTemplate = @options.groups[groupIndex].itemTemplate
			header = @options.groups[groupIndex].headerTemplate
		if itemTemplate is null
			itemTemplate = @options.render.itemTemplate
		groupContainer = $(templates.groupTemplate)
		if groupIndex isnt -1
			groupContainer.addClass(@options.groups[groupIndex].groupClass)
		if header
			headerContainer = $(templates.groupHeaderTemplate).html($(header))
			groupContainer.append(headerContainer)
		if @options.maxViewedCount
			data = _.first(data, @options.maxViewedCount)
		_.each(data, (itemData, index) =>
			listItem = @_createListItem(itemData, index, itemTemplate, groupContainer)
			@options.aclist.currentList.push(listItem)
		)
		@options.aclist.list.append(groupContainer)

	_createListItem: (data, index, template, parent) ->
		if typeof template is "function"
			template = template(data, index)
		itemContainer = $(templates.itemTemplate)
		$(_.template(template, data)).appendTo(itemContainer)
		itemContainer.appendTo(parent)
		itemContainer.data("data", data)
		itemContainer.data("index", index)
		if @options.highlightResults
			elemToHighlight = itemContainer.find("." + classes.highlightClass)
			if (elemToHighlight.length > 0)
				innerHighlight(elemToHighlight[0], @options.typeInput.val())
		itemContainer

	_createNewItem: (value) ->
		if typeof @options.create is "function"
			promise = new $.Deferred();
			@options.create(value, promise).done((item) =>
				@_addValue(item)
				@options.typeInput.val("").focus()
			).fail(() =>
				@options.typeInput.val("").focus()
			)
		else
			throw "Create function should be implemented"



MicroEvent.mixin(Plugin)

$.extend(
	richAutocompleteDataProvider: (data, term = "label", comparator = null) ->
		throw "data should be array" unless _.isArray(data)
		if comparator == null
			comparator = (dataItem, value, groupIndex, term) ->
				dataItem[term].toLowerCase().indexOf(value.toLowerCase()) >= 0
		return (value) ->
			deferred = new $.Deferred()
			if data.length is 0
				return deferred.resolve([])
			if _.isArray(data[0])
				result = []
				_.each(data, (group, groupIndex) ->
					result.push(_.filter(group, (item) ->
						comparator(item, value, groupIndex, term)
					))
				)
				return deferred.resolve(result)
			else
				result = _.filter(data, (item) ->
					comparator(item, value, -1, term)
				)
				return deferred.resolve(result) 			


);

$.extend(
	richAutocompleteAjaxProvider: (url, additionalData = {}, term = "term", type = "get") ->
		return (value) ->
			if typeof additionalData is "function"
				additionalData = additionalData()
			data = {}
			data[term] = value
			$.ajax(
				type: type
				url: url
				dataType: "json"
				data: $.extend({}, data, additionalData)
			)
)

$.fn[pluginName] = (options) ->
	if typeof arguments[0] is "string"
		methodName = arguments[0]
		args = Array.prototype.slice.call(arguments, 1)
		returnVal = null
		@each( ->
			if $.data(this, "plugin_" + pluginName) and (typeof $.data(this, "plugin_" + pluginName)[methodName] is "function")
				if (methodName isnt "") && (methodName.charAt(0) isnt "_")
					plugin = $.data(this, "plugin_" + pluginName)
					returnVal =  plugin[methodName].apply(plugin.context, args)
				else
					throw new Error("Method " + methodName + " is private method of jQuery." + pluginName);
			else
				throw new Error("Method " + methodName + " does not exist on jQuery." + pluginName); 
		)
		return returnVal
	else if typeof options is "object" || !options
		@each( ->
			if !$.data(this, "plugin_" + pluginName)
				$.data(this, "plugin_" + pluginName, new Plugin(this, options))
		)