
SJTest.expectTests(11);			

SJTest.run(
	{name:'I18N',

		regex_number: function() {
			var m1 = "123".match(I18N.NUMBER);
			assert(m1);
			assert( ! "foo".match(I18N.NUMBER))
		},

		canon_vars: function() {
			i18n = new I18N("fr", "Hello {Dan}	Bonjour {Dan}");
			var c1 = i18n.canon("Hello {Dan}");
			assertMatch(c1, "Hello "+I18N._MARKERCHAR+"0");	
		},

		canon_numbers: function() {
			i18n = new I18N("fr", "You have 3 message(s)	Vous avez 3 message(s)");
			var c1 = i18n.canon("You have 5 messages");
			assertMatch(c1, "You have "+I18N._MARKERCHAR+"0 messages");	
		},
		
		canon_space: function() {
			i18n = new I18N("fr", "Hello Dan	Bonjour Dan");
			var c1 = i18n.canon("Hello	\n	Dan");
			assertMatch(c1, "Hello Dan");	
		},
		
		es: function() {
			var i18n = new I18N("es", "Hello	Ola\nWorld	Mundo");							
			var spanish = i18n.tr("Hello");
			assertMatch(spanish, "Ola");
		},
		
		plurals: function() {
			i18n = new I18N("fr", "You have 3 message(s)	Vous avez 3 message(s)");
			var french5 = i18n.tr("You have 5 message(s)");
			assertMatch(french5, "Vous avez 5 messages");
			
			var french1 = i18n.tr("You have 1 message(s)");
			assertMatch(french1, "Vous avez 1 message");
				
		},
		
		uncanon_extraNumbers: function() {
			// The translation has a number, which isn't in the original
			i18n = new I18N("fr", "test	test1");
			var ts = i18n.tr("test");
			assertMatch(ts, "test1");															
		},
		
		_uncanon2_pluralise: function() {
			i18n = new I18N("fr", "You have 3 message(s)	Vous avez 3 message(s)");
			// singular
			var s = i18n._uncanon2_pluralise("foo(s) bar(s)", [1]);
			assertMatch(s, "foo bar");
			// plural
			var pl = i18n._uncanon2_pluralise("foo(s) bar(s)", [2]);
			assertMatch(pl, "foos bars");
			// ?
			var hm = i18n._uncanon2_pluralise("foo(s) bar(s)", ['monkey']);
			assertMatch(hm, "foo(s) bar(s)");
			// German
			var de1 = i18n._uncanon2_pluralise("Hund(e)", [1]);
			assertMatch(de1, "Hund");
			var de2 = i18n._uncanon2_pluralise("Hund(e)", [2]);
			assertMatch(de2, "Hunde");
		},
		
		
		multiTranslatePolishCrude: function() {
			i18n = new I18N("pl", "");
			// Put the general case first!
			// NB: Plural is the general case because it covers many more options than singular.
			i18n.add("5 house(s)", "5 domow");
			// Then add the more specific over-rides
			i18n.add("1 house(s)", "1 dom");
			i18n.add("2 house(s)", "2 domy");
			
			assertMatch(i18n.tr("6 house(s)"), "6 domow");
			assertMatch(i18n.tr("1 house(s)"), "1 dom");
			assertMatch(i18n.tr("2 house(s)"), "2 domy");							
		},
		
		multiTranslatePolishSophisticated: function() {
			i18n = new I18N("pl", "");
			// Put the general case first!
			i18n.add("5 house(s)", "5 domow");
			// Then add the more specific over-rides
			i18n.add("1 house(s)", "1 dom", {"number":"singular"});
			i18n.add("2 house(s)", "2 domy", {"number":"paucal"});
			
			i18n.categorise = function(v) {
				if (typeof(v)==='number' || (''+v).match(I18N.NUMBER)) {
					if (v==1) return {"number":"singular"};
					if (v==2 || v==3 || v==4) return {"number":"paucal"};
					if (v>4) return {"number":"plural"};
				}
				return false;
			};
			
			assertMatch(i18n.tr("6 house(s)"), "6 domow");
			assertMatch(i18n.tr("1 house(s)"), "1 dom");
			assertMatch(i18n.tr("2 house(s)"), "2 domy");
			assertMatch(i18n.tr("3 house(s)"), "3 domy");
		},
	
		
		fallback: function() {
			var i18n = new I18N("es", "no data!");
			// place holder
			var english = i18n.tr("Hello {Alice}!");
			assertMatch(english, "Hello Alice!");
			// -s
			var englishs = i18n.tr("How are your 17 cat(s)?");
			assertMatch(englishs, "How are your 17 cats?");
		},
		
		noCurlyBraces: function() {
			var i18n = new I18N();
			english = i18n.tr("{Local} Dashboard");
			assertMatch(english, "Local Dashboard");
		},
		

		failSmokeTest: function() {
			var i18n = new I18N("fr", "#test");
			var fooby = i18n.tr("fromage");
			return "check console for fromage warning, and console:network-tab for the /lg remote logging call";
		},

		jQuery_tr: function() {
			var i18n = new I18N();
			i18n.add("Hello", "Bonjour");
			i18n.add("<a>World</a>", "<a>Tout le Monde</a>");
			$('.testjQuery').tr(i18n);
			var out = $('.testjQuery').text();
			assertMatch(out, "Bonjour Tout le Monde");
			return out;
		}
	});	
