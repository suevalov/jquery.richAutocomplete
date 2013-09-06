pluginName = "richAutocomplete"
defaults =

	containderWidth: false


	initialValue: false
	
	# events #
	onInit: false
	onClear: false
	onSet: false
	onBlur: false
	onFocus: false

	# required properties #
	provider: false
	defaultLabelTemplate: '<div class="-label"><%= label %></div>'

	# additional properties #
	defaultTerm: "label"
	minLength: 1
	loadingText: "Loading..."
	notFoundText: "Nothing was found"
	showLoading: false,
	highlightResults: true
	maxViewedCount: false
	placeholder: false
	groups: null

	###

		groups: [
			{
				template: "some template"
				header: "header",
				groupClass: "someClass"	
			}
		]

	###

	# classes #
	placeholderClass: "-richAutocomplete__placeholder"
	inputClass: "-richAutocomplete__input"
	hiddenInputClass: "-richAutocomplete__hidden-input"
	additionalWrapperClass: ""
	additionalItemClass: ""
templates = 
	listContainer: '<div class="-richAutocomplete__list-container" />'
	list: '<div class="-richAutocomplete__list" />'
	loadingItem: '<div class="-richAutocomplete__loading" />'
	itemTemplate: '<div class="-richAutocomplete__list-item" />'
	notFoundTemplate: '<div class="-richAutocomplete__not-found" />'
	wrapperTemplate: '<div class="-richAutocomplete__wrapper"/>'
	groupTemplate: '<div class="-richAutocomplete__item-group"></div>'
	groupHeaderTemplate: '<div class="-richAutocomplete__item-group-header"></div>'

### Pub/Sub implementation ###

getPubSub = ->

	topics = {}
	subUid = -1
	return {
		on : (topic, func) ->
			topics[topic] = []  unless topics[topic]
			token = (++subUid).toString()
			topics[topic].push
				token: token
				func: func

			token

		trigger : (topic, args) ->
			return false  unless topics[topic]
			setTimeout (->
		    	subscribers = topics[topic]
		    	len = (if subscribers then subscribers.length else 0)
		    	subscribers[len].func topic, args  while len--
			), 0
			true

		off : (token) ->
			for m of topics
				if topics[m]
					i = 0
					j = topics[m].length

					while i < j
						if topics[m][i].token is token
							topics[m].splice i, 1
							return token
						i++
			false
	}


### Hightlighter ###

innerHighlight = (node, pat) ->
	skip = 0
	if node.nodeType is 3
		pos = node.data.toUpperCase().indexOf(pat.toUpperCase())
		if pos >= 0
			spannode = document.createElement("span")
			spannode.className = "highlight"
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
	  

### Plugin class ###

class Plugin

	element: null,
	options: null,
	context: null,

	###
		Plugin constructor
	###
	constructor: (@element, options) ->
		@context = @
		@options = $.extend({}, defaults, options)
		@_defaults = defaults
		@_name = pluginName
		@_init()

	###
		/////////  Events  ///////////
	###

	_onInit: ->
		if @options.onInit && typeof @options.onInit is "function"
			@options.onInit(@_getPublicApi())

	_onClear: ->
		if @options.onClear && typeof @options.onClear is "function"
			@options.onClear(@_getPublicApi())

	_onSet: ->
		if @options.onSet && typeof @options.onSet is "function"
			@options.onSet(@_getPublicApi())

	_onBlur: ->
		if @options.onBlur && typeof @options.onBlur is "function"
			@options.onBlur(@_getPublicApi())

	_onFocus: ->
		if @options.onFocus && typeof @options.onFocus is "function"
			@options.onFocus(@_getPublicApi())

	_getPublicApi: ->
		{
			element: @options.element
			selectedItem: @getSelectedItemElem()
			setValue: @setValue.bind(@)
			clearValue: $.proxy(@clearValue, @)
			getValue: $.proxy(@getValue, @)
			moveToNextInList: $.proxy(@moveToNextInList, @)
			moveToPrevInList: $.proxy(@moveToPrevInList, @)
			search: $.proxy(@_search.bind, @)
			changePlaceholder: $.proxy(@changePlaceholder, @)
			setProvider: $.proxy(@setProvider, @)
		}

	### 
		/////// Public methods /////////// 
	###

	setValue: (data) ->
		@_removePlaceholder()
		@options.hiddenElement.val(JSON.stringify(data)).trigger("change")
		@options.element.val(data[@options.defaultTerm])
		@options.textVal = data[@options.defaultTerm]
		@options.currentData = data
		@_onSet()

	changePlaceholder: (placeholder) ->
		@options.placeholder = placeholder
		@_setPlaceholder()

	setProvider: (provider) ->
		@options.provider = provider

	clearValue: ->
		@options.textVal = ''
		@options.hiddenElement.val('').trigger("change")
		@options.element.val('')
		@options.currentData = null
		@_setPlaceholder() unless @options.element.is(":focus")
		@_onClear()

	getValue: ->
		return @options.currentData

	getSelectedItemElem: ->
		if @options.aclist.currentSelectedItem
			return @options.aclist.currentSelectedItem.element
		return null

	moveToNextInList: ->
		resultsCount = @options.aclist.currentList.length
		if resultsCount > 1 or (@options.aclist.currentIndex is -1 and resultsCount > 0)
			if @options.aclist.currentSelectedItem
				@options.aclist.currentSelectedItem.deselect()
			newIndex = @options.aclist.currentIndex + 1
			if newIndex >= resultsCount
				newIndex = 0
			@options.aclist.currentSelectedItem = @options.aclist.currentList[newIndex]
			@options.aclist.currentIndex = newIndex
			@options.aclist.currentSelectedItem.select()


	moveToPrevInList: ->
		resultsCount = @options.aclist.currentList.length
		if resultsCount > 1 or (@options.aclist.currentIndex is -1 and resultsCount > 0)
			if @options.aclist.currentSelectedItem
				@options.aclist.currentSelectedItem.deselect()
			newIndex = @options.aclist.currentIndex - 1
			if newIndex < 0
				newIndex = resultsCount - 1
			@options.aclist.currentSelectedItem = @options.aclist.currentList[newIndex]
			@options.aclist.currentIndex = newIndex
			@options.aclist.currentSelectedItem.select()


	###
		//////  Private methods  ///////
	###


	_init: ->
		@_setSettings()
		@_createElem()

		if typeof @options.initialValue is "function"
			@options.initialValue().done((initialValue) =>
				@setValue(initialValue)
				@_bindEvents()
				@_onInit()
			)
			return
		else if typeof @options.initialValue is "object"
			@setValue(@options.initialValue)
		@_bindEvents()
		@_onInit()

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

	_setPlaceholder: ->
		if @options.placeholder and @getValue() is null
			@options.element.val(@options.placeholder)
			@options.element.addClass(@options.placeholderClass)

	_removePlaceholder: ->
		if @options.element.hasClass(@options.placeholderClass)
			@options.element.val("")
			@options.element.removeClass(@options.placeholderClass)

	_search: ->
		@options.textVal = @options.element.val()
		if @options.showLoading
			@options.aclist.list.hide()
			@options.aclist.loadingItem.html(@options.loadingText).show()
		@_openContainer()
		@options.provider(@options.textVal).done((response) =>
			if @options.showLoading
				@options.aclist.loadingItem.hide()
			@options.aclist.currentList = []
			@options.aclist.currentSelectedItem = null
			@options.aclist.currentIndex = -1

			@options.aclist.list.empty().show()
			if @options.textVal is @options.element.val()
				@_onLoadList(response)
		)

	_startIntervalCheck: ->
		@options.intervalCheck = setInterval( =>
			newValue = @options.element.val()
			if newValue.length >= @options.minLength
				if @options.element.val() isnt @options.textVal
					@_search()					
			else if newValue is "" && @options.element.val() isnt @options.textVal
				@clearValue()
			else
				@_closeContainer()
		, 400)

	_stopIntervalCheck: ->
		clearInterval(@options.intervalCheck)
		
	_setSettings: ->
		@options.closed = true
		@options.canCloseOnBlur = true
		@options.currentIndex = 0
		@options.closed = true
		@options.currentData = null
		@options.textVal = ""
		@options.element = $(@element)
		@options.aclist = {}
		@options.aclist.currentIndex = -1
		@options.aclist.currentList = []

	_createElem: ->
		$element = @options.element

		@options.aclist.wrapper = $element.wrap(templates.wrapperTemplate).addClass(@options.additionalWrapperClass)

		# create hidden input below current
		@options.hiddenElement = $("<input type='hidden' name='" + $element.attr("name") + "' />")
									.val($element.val())
									.insertAfter($element)
		$element.removeAttr("name").val('');

		@options.element.addClass(@options.inputClass)
		@options.hiddenElement.addClass(@options.hiddenInputClass)

		@options.aclist.container = $(templates.listContainer).insertAfter($element).hide()
		containerWidth
		if @options.containerWidth
			containerWidth = @options.containerWidth
		else
			containerWidth = @options.element.outerWidth() - (@options.aclist.container.outerWidth() - @options.aclist.container.width())

		if !@options.placeholder
			if @options.element.attr("placeholder")
				@options.placeholder = @options.element.attr("placeholder")
				$element.removeAttr("placeholder")

		@options.aclist.container.width(containerWidth)

		@options.aclist.list = $(templates.list).appendTo(@options.aclist.container)

		if @options.showLoading
			@options.aclist.loadingItem = $(templates.loadingItem).appendTo(@options.aclist.container).hide()

		if @options.placeholder
			@_setPlaceholder()

	_bindEvents: ->

		@options.element.on(
			"keydown.richAutocomplete": (e) =>
				switch e.which
					# enter
					when 13
						valLength = @options.element.val().length
						if valLength >= @options.minLength
							if @options.aclist.currentSelectedItem
								@options.aclist.currentSelectedItem.enter()
							else
								@_search()
					# down
					when 40
						@moveToNextInList() unless @options.closed
						false
					# up
					when 38
						@moveToPrevInList() unless @options.closed
						false
					# esc
					when 27
						if @options.currentData
							@setValue(@options.currentData)
						else
							@clearValue()
						@_closeContainer()

			"focus.richAutocomplete": =>
				@_removePlaceholder()
				@_startIntervalCheck()
				@_onFocus()

			"blur.richAutocomplete" : =>
				@_stopIntervalCheck()
				# if we can close container
				if @options.canCloseOnBlur
					if @options.currentData
						@setValue(@options.currentData)
					else
						@clearValue()
					@_closeContainer()
					@_onBlur()


		)

		@options.aclist.container.off(".richAutocomplete").on(
			"mousedown.richAutocomplete": =>
				@options.canCloseOnBlur = false
			"mouseleave.richAutocomplete": =>
				@options.canCloseOnBlur = true
		)

	_onLoadList: (data) ->
		@options.aclist.list.empty()
		@options.aclist.currentList = []
		if (data.length > 0)
			if _.isArray(data[0])
				if !_.isArray(@options.groups) or @options.groups.length isnt data.length
					throw "For grouped data should be defined groups settings."
				_.each(data, (group, index) =>
					group = new ListGroup(group, @, index)
					group.render()
				)
			else
				group = new ListGroup(data, @)
				group.render()
			if @options.aclist.currentList.length is 0
				notFoundTemplate = $(templates.notFoundTemplate).html(@options.notFoundText).appendTo(@options.aclist.list)
			else if @options.currentData
				currentItem = _.first(_.filter(@options.aclist.currentList, (listItem) => 
					_.isEqual(listItem.data, @options.currentData)
				))
				@options.aclist.currentSelectedItem = currentItem
				@options.aclist.currentIndex = _.indexOf(@options.aclist.currentList, currentItem)
				currentItem.select()
		else
			notFoundTemplate = $(templates.notFoundTemplate).html(@options.notFoundText).appendTo(@options.aclist.list)

class ListGroup
	constructor: (@data, @plugin, @groupIndex = -1) ->
		@options = @plugin.options

	render: ->
		if @data.length is 0
			return
		if @groupIndex is -1
			itemTemplate = @options.defaultLabelTemplate
			header = null
		else
			itemTemplate = @options.groups[@groupIndex].template
			header = @options.groups[@groupIndex].header
		groupContainer = $(templates.groupTemplate)
		if @groupIndex isnt -1
			groupContainer.addClass(@options.groups[@groupIndex].groupClass)
		if header
			headerContainer = $(templates.groupHeaderTemplate).html($(header))
			groupContainer.append(headerContainer)
		if @options.maxViewedCount
			@data = _.first(@data, @options.maxViewedCount)
		_.each(@data, (itemData, index) =>
			listItem = new ListItem(itemData, index, @options, itemTemplate, groupContainer)
			listItem.on("click.richAutocomplete", (event, item) => 
				@plugin.setValue(item.data)
				@plugin._closeContainer()
			)
			listItem.on("mouseover.richAutocomplete", (event, item) =>
				if @options.aclist.currentSelectedItem && @options.aclist.currentIndex isnt item.index
					@options.aclist.currentSelectedItem.deselect()
				@options.aclist.currentSelectedItem = item
				@options.aclist.currentIndex = item.index
			)
			listItem.render()
			@options.aclist.currentList.push(listItem)
		)
		@options.aclist.list.append(groupContainer)



class ListItem
	constructor: (@data, @index, @options, @template, @parent) ->
		_.extend(@, getPubSub())
	render: ->
		if typeof @template is "function"
			template = @template(@data, @index)
		else
			template = @template
		itemContainer = $(templates.itemTemplate).addClass(@options.additionalItemClass)
		$(_.template(template, @data)).appendTo(itemContainer)
		itemContainer.appendTo(@parent)
		@element = itemContainer

		if @options.highlightResults
			innerHighlight(@element.find(".-label")[0], @options.element.val())

		@_bindEvents()
		@
	_bindEvents: ->
		@element.on("click.richAutocomplete", =>
			@trigger("click.richAutocomplete", @)
		)
		@element.on("mouseover.richAutocomplete", =>
			@select()
			@trigger("mouseover.richAutocomplete", @)
		)
		@element.on("mouseleave.richAutocomplete", =>
			@deselect()
		)
	select: ->
		@element.addClass("active")

	deselect: ->
		@element.removeClass("active")

	enter: ->
		@trigger("click.richAutocomplete", @)


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


$.extend(
	richAutocompleteAjaxWithCacheProvider: (url, additionalData = {}, term = "term", type = "get") ->
		cache = []
		return (value) ->
			console.log(cache)
			deferred = new $.Deferred()
			if cache[value]
				deferred.resolve(cache[value])
			else
				$.richAutocompleteAjaxProvider(url, additionalData, term, type)(value)
					.done((response) ->
						cache[value] = response unless cache[value]
						deferred.resolve(response)
					)
					.fail((response) ->
						deferred.reject(response)
					)
			deferred.promise()
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
		if returnVal isnt null
			return returnVal
		else
			return @
	else if typeof options is "object" || !options
		@each( ->
			if !$.data(this, "plugin_" + pluginName)
				$.data(this, "plugin_" + pluginName, new Plugin(this, options))
		)