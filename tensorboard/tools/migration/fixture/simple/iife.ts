var foo;
var one = {1: 'two'};
(function(foo) {
  (function(bar) {
    Polymer({
      is: 'tf-whatever',
      properties: {
        foo: {
          type: String,
          value: 'bar',
        },
      },
    });
  })(foo.bar || (foo.bar = {}));
  foo.baz = function() {};
})(foo || (foo = {}));
