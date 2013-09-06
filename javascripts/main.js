(function() {

	"use strict";

	var cities = [
		{
			id: 1,
			label: "Moscow"	
		},
		{
			id: 2,
			label: "Saint Peterburg"
		},
		{
			id: 3,
			label: "New York"
		},
		{
			id: 4,
			label: "Oslo"
		},
		{
			id: 5,
			label: "London"
		},
		{
			id: 6,
			label: "Paris"
		},
		{
			id: 7,
			label: "New Mexico"
		},
		{
			id: 8,
			label: "San Francisco"
		},
		{
			id: 9,
			label: "New Orlean"
		},
		{
			id: 10,
			label: "Amsterdam"
		}
	];

	// Mock Ajax

	$.mockjax({
		url: '/sample/demo1',
		responseTime: 300,

		response: function(request) {
			var term = request.data.term;
			var result = cities;
			result = _.filter(result, function(item) {
				return item.label.toLowerCase().indexOf(term.toLowerCase()) >= 0;
			})
			this.responseText = JSON.stringify(result);
		}
	});

	// Plugin configuration

	$("input[name=demo1]").richAutocomplete({
		provider: $.richAutocompleteAjaxProvider("/sample/demo1")
	})

}());