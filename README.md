jquery.richAutocomplete 0.1
=======================

Autocomplete plugin with some advanced features:

* Different data providers: asychronous data provider, local data provider. Possibility to create your own data providers, for example, local storage data provider.
* Placeholder for input, which works in all browsers.
* Possibility to setup template for result item.
* Possibility to group results to differents chunks.
* Possibility to setup different templates for different chunks.

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


