jquery.richAutocomplete
=======================

Autocomplete plugin with some advanced features:

* Different data providers: asychronous data provider, local data provider. Possibility to create your own data providers, for example, local storage data provider.
* Placeholder for input, which works in all browsers.
* Possibility to setup template for result item.
* Possibility to group results to differents chunks.
* Possibility to setup different templates for different chunks.

### Dependecies ###

* jQuery
* Underscore

### Basic initialization

```js
$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteAjaxProvider("some/sample/url")
});
```

### Settings

There are some properties that you can setup:

| Property    | Description   |
| ------------- |-------------|
| provider    | data provider *[required]* |
| minLength   |  minimal characters count to start searching *[default_value = 1]* |
| placeholder | placeholder for input, you should pay attention, that 'placeholder' attribute in input overriders 'placeholder' setting  |
| maxViewedCount | maximum items count, which will be visible in popup container *[default_value = false]* |
| containerWidth | by default popup container width equals input width, but you can override it by setting up this parameter with concrete pixels *[default_value = false]* |  
| defaultTemplate | Default template for items in popup container. Templates should have Underscore template syntax. *[default_value = "<div class='-highlight'><%= label %></div>"]* "
| initialValue | Initial object value which will be set to input on plugin initialization. *[default_value = false ]* |
| highlightResults | Searching and highlighting entered value in item template ( within "-label" class)  *[default_value = true]* |
| defaultTerm | Value in incoming result object which will be main. *[default_value = "label"]* |
| showLoading | Show loading template between showing searchResults *[default_value = false ]* |
| loadingTemplate | Loading text which will be shown at loading template. *[default_value = "Loading..."]* |
| emptyTemplate | Text which will be shown when search returns empty result. *[default_value = "Nothing was found."]* |
| groups | Settings for grouped results (See explanation below) *[default_value = null ]* |
| placeholderClass | Class which will be added to input, when placeholder is shown. *[default_value = "-richAutocomplete__placeholder" ]* |
| inputClass | Class which will be added to input. *[default_value = "-richAutocomplete__input" ]* "
| hiddenInputClass | Class which will be added to generated hidden input. *[default_value = "-richAutocomplete__hidden-input"]*  |
| additionalWrapperClass | Class which will be added to generated input wrapper. *[default_value = "" ]* |
| additionalItemClass | Class which will be added to each item in popup results container. *[default_value = "" ]* |

Also you can define some event handlers: 

|  Event  |  Description   |
| ------------- | ------------- |
| onInit | Calls on plugin initialization |
| onClear | Calls on input reset |
| onSet | Calls on setting value to input |
| onFocus | Calls on focus at input |
| onBlur | Calls on blur from input |

### Data providers

There are 3 implemented data providers for plugin:
* static data provider;
* asychronous data provider;
* asychronous data provider with caching.

You can implement your own data provider. Creating new data provider described below.
#### Static data provider
```js
var cities = [
	{
		id: 1,
		label: "New York",
		country: "USA"
	},
	...
	{
		id: 10,
		label: "Moscow",
		country: "Russia"
	}
];

$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteDataProvider(cities)
});
```
By default, *richAutocompleteDataProvider* filters items by comparing *data.label* value with entered value at lowercase.
If you want to compare another field, you can pass *field name* as a second parameter of provider function.

```js
	provider: $.richAutocompleteDataProvider(cities, "country")
```

If you want to implement your own complex comparator, you can pass it as a third parameter of provider function.

```js
/**
 * @param {Object} comparable object
 * @param {String} entered value
 * @param {Number} index of group which data come from (see later)
 */
var myComparator = function(data, value, groupIndex) {
	// implement your own logic
	// function should return true or false as a result
};
	
$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteDataProvider(cities, null, myComparator)
});
	
```
#### Asychronous data provider
```js
$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteAjaxProvider("/some/url")
});
```
By default you should pass only *url address* to data provider. In that case, it will generate AJAX call with the following parameters:
```js
$.ajax({
	type: 'get',
	url: "/some/url",
	dataType: 'json',
	data: {
		term: value
	}
})
```
You can change send data and request type by passing some extra paramenters to provider function.
```js
// additional data can be an object
var additionalSendData = {
	param1: "param1",
	param2: "param2"
}
// or a function which returns an object
var additionalSendData = function() {
	return {
		param1 : getMeParam1(),
		param2 : getMeParam2()
	};
}

$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteAjaxProvider("/some/url", additionalSendData, "label", "post")
});
```
That configuration will generate the following AJAX request:
```js
$.ajax({
	type: 'post',
	url: "/some/url",
	dataType: 'json',
	data: {
		label: value,
		param1: "param1",
		param2: "param2"
	}
})
```
#### Asychronous data provider with caching
```js
$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteAjaxWithCacheProvider("/some/url")
});
```
This provider accepts similar parameters as *richAutocompleteAjaxProvider*.

#### Creating your own provider
If you want to implement your own provider you should create function with following pattern:
```js
var myProviderFunction = function(param1, param2) {
	var someDataStorage;
	return function(value) {
		// this function should return jQuery.promise object
		var deferred = new $.Deferred();
		var result = someDataStorage.findAllItemByValue(value);
		return deferred.resolve(result);
	}
	
}
```

### Defining item template

You can override default item template by setting up **defaultLabelTemplate** property.

```js

var cities = [
	{
		id: 1,
		label: "New York",
		country: "USA",
		population: "8.3 millions"
	},
	...
	{
		id: 10,
		label: "Moscow",
		country: "Russia",
		population: "11.5 millions"
	}
];

// template can be a string
$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteDataProvider(cities),
	defaultTemplate: "<div><span class='-highlight'><%= label %></span> - <span><%= country %></span></div>"
});

// or template can be a function
$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteDataProvider(cities),
	defaultTemplate: function(data) {
		if (data.id % 2 === 0) {
			return "<div><span class='-highlight'><%= label %></span> - <span><%= country %></span></div>";
		} else {
			return "<div><span class='-highlight'><%= label %></span> - <span><%= population %></span></div>"
		}
	}
});

```

### Public methods

Plugin allows to call manually some public functions from outside.

```js

$("input[name=someInputName]").richAutocomplete(methodName, methodData);	

```

* **setValue(data)** - set value to compoment
* **getValue()** - returns current seletected value
* **clearValue()** - clears component value
* **changePlaceholder(placeholder)** - set new placeholder
* **setProvider(provider)** - set data provider

### Grouped results

Additional plugin feature is possibility to accept and show grouped results. What does it mean? Lets look at the example!

```js

// Lets say that we have three arrays of cities: the first includes only capitals, 
// the second - cities with population more than 1 million people, the third - cities with population less than 1 million people

var cities = [
	[
		{
			label: "Washington, D.C.",
			country: "USA"
		},
		{
			label: "London",
			country: "UK"
		},
		{
			label: "Moscow",
			country: "Russian Federation"
		}
	],
	[
		{
			label: "New York",
			country: "USA",
			population: "8.3 millions"
		},
		{
			label: "Birmingham",
			country: "UK",
			population: "1 million"
		},
		{
			label: "Saint Petersburg",
			coutry: "Russian Federation",
			population: "4.8 millions"
		}
	],
	[
		{
			label: "Springfield",
			country: "USA",
			population: "150k",
			region: "Massachusetts"
		},
		{
			label: "Manchester",
			country: "UK",
			population: "500k",
			region: "North West England"
		},
		{
			label: "Cherepovets",
			coutry: "Russian Federation",
			population: "330k",
			region: "Vologda Region"
		}
	]
];

// As you can see, each group has different data properties and we want to define unique template for each group

$("input[name=someInputName]").richAutocomplete({
	provider: $.richAutocompleteDataProvider(cities),
	groups: [
		{
			template: function(data) {
				return "<div><%= label %></div><div><i><%= country %></i></div>";		
			},
			header: "<h2>Capitals</h2>",
			groupClass: "-citiesCapitalsClass"	
		},
		{
			template: function(data) {
				return "<div><%= label %></div><div><i><%= country %></i></div><div><i><%= population %></i></div>";
			},
			header: "<h2>Megalopolis</h2>",
			groupClass: "-citiesMegalopolisesClass"	
		},
		{
			template: function(data) {
				return "<div><%= label %> , <%= region %></div><div><i><%= country %></i></div><div><i><%= population %></i></div>";
			},
			header: "<h2>Other cities</h2>",
			groupClass: "-citiesOtherClass"	
		}
	]
	
});


```

Then it will generate following HTML code:

```html

<div class="-richAutocomplete__list">
	<div class="-richAutocomplete__item-group -citiesCapitalsClass">
		<div class="-richAutocomplete__item-group-header">
			<h2>Capitals</h2>
		</div>
		<div class="-richAutocomplete__list-item">
			<div>Washington, D.C.</div>
			<div><i>USA</i></div>
		</div>
		<div class="-richAutocomplete__list-item">
			<div>Moscow</div>
			<div><i>Russian Federation</i></div>
		</div>
	</div>
	<div class="-richAutocomplete__item-group -citiesMegalopolisesClass">
		<div class="-richAutocomplete__item-group-header">
			<h2>Megalopolis</h2>
		</div>
		<div class="-richAutocomplete__list-item">
			<div>New York</div>
			<div><i>USA</i></div>
			<div><i>8.3 millions</i></div>
		</div>
	</div>
</div>

```

