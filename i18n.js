/**
 * i18n.js	A simple flexible Javascript internationalisation system
 * 
 * Author: Daniel Winterstein   
 * Version: 0.2.3   
 * Copyright: Winterwell http://winterwell.com   
 * Requires: jQuery, and SJTest (optional but recommended) for synchronous ajax loading.   
 * License: MIT (a commercially friendly open source license)
 * 
 * 
 * https://en.wikipedia.org/wiki/Inflection:
 * In grammar, inflection or inflexion is the modification of a word to express different grammatical categories such as 
 * tense, mood, voice, aspect, person, number, gender and case.
 * 
 * It's interesting how limited the enterprise level complex systems are. 
 * E.g. No support for gender? It suggests that the language used in software 
 * is limited enough for "You have 5 message(s)" & similar to be the _only_
 * common complex case.
 * 
 * This may be the best that a lookup based system can do. Possibly the best 
 * that any system can do without requiring serious computer power.
 * 
 * Simple but limited: Roll-your-own string mangling.
 * 
 * Complex & limited:
 * http://doc.qt.digia.com/qq/qq19-plurals.html
 * or
 * https://www.gnu.org/software/gettext/manual/html_node/Translating-plural-forms.html 
 * 
 */

/**
 * @class I18N
 * 
 * @param lang {string} - Two-character ISO639 language code of the destination language,
 * or a language_region locale code (e.g. "en_US"), 
 * or a custom value for special languages (eg 'lolcat', or 'user-defined')
 * 
 * @param data {?string} - Contents of translation csv file for `lang`, 
 * OR a url to load a translation csv file.
 * OR an app-tag (obtained from the i18njs portal; begins with a #) to load from the i18njs portal (if you have an account).
 * Loading is done synchronously (it will block), using jQuery.
 * 
 * @param appTag {?string} Tag to report translation misses to the i18njs portal (if you have an account).
 * If an appTag is provided for the data parameter (see above), then there is no need to repeat it here.
 * appTags must begin with a #
 * 
 * @param local {boolean} Use the local server for this I18N rather than i18n.soda.sh.
 * Defaults to using i18n.soda.sh if absent.
**/
function I18N(lang, data, appTag, local) {	
	this.version = "0.2.3";
	/** Two-character ISO639 language code of the destination language, 
 * or a custom value for special languages (eg 'lolcat', or 'user-defined') */
	this.lang = lang;
	/**
	 * {string} Used for reporting untranslatable items.
	 * @see I18N.onfail()
	 */
	this.appTag = appTag? appTag : false;
	
	this.urlPrefix = local ? '' : 'https://i18n.soda.sh';

	this.fails = {};
	
	/**
	 * Format dates. By default uses Date.toLocaleString(), which uses the browser's locale setting.
	 * Users can replace this with their own function -- or with false to switch off.
	 * @param date {Date}
	 * @returns {string}
	 */
	this.dateFormat = function(date) {
		// TODO Maybe pass a locale in, taken from this.lang? Newer browsers will support it.
		return date.toLocaleString();
	};
	/**
	 * Format numbers. By default does nothing.
	 * Users can replace this with their own function -- or with false to switch off. 
	 * @param num {number}
	 * @returns {string}
	 */
	this.numberFormat = function(num) {
		return num.toString();
	};
	
	/**
	 * {boolean} Is it safe to use this?
	 */
	this.loaded = true; // may be reset to false by ajax call below
	
	this.en2lang = {};
	
	this.active(true);
	
	// Load data?
	if ( ! data) {
		return;
	}

	// Is the file more than one word? Then treat it as the input
	if ( ! data.match(/^\S+$/)) {
		this._parseFile(data);
		return;
	}
	// Treat file as a url.
	// Is it an i18njs app-tag? Then load from the portal
	if (data.charAt(0)==='#') {
		// Portal resource
		if ( ! this.appTag) this.appTag = data;
		// Guess the language? This isn't reliable but it's a sensible fallback.
		if ( ! this.lang) {
			var _lang = I18N.getBrowserLanguage();
			// But don't guess English, as that's probably the original
			if (_lang!=='en') this.lang = _lang;
			// Don't load null
			if ( ! this.lang) return;
		}			
		data = this.urlPrefix+'/i18n-trans.csv?tag='+escape(data)+'&lang='+escape(this.lang);
	}
	try {
		this._loadFile(data);
	} catch(err) {
		/* Swallow file-load errors! That way you still get an I18N object */
		console.error(err);
	}	
}

/**
 * Automatically called when an I18N object is made (so the most recently made is the active one). 
 * You can also call it explicitly to swap between objects.
 * @param on {?boolean} Set this to be active (or not).
 * @returns true if this is active
 */
I18N.prototype.active = function(on) {
	/**
	 * {I18N} The most recently made (or activated) I18N object. This will be used as a default by the jQuery plugin.
	 */
	if (on) I18N.active = this;
	else if (on!==undefined && this === I18N.active) {
		I18N.active = null;
	}
	return this === I18N.active;
};

/**
 * Convenient static access to a global I18N
 */
I18N.tr = function(original) {
	if ( ! I18N.active) new I18N();
	return I18N.active.tr(original);	
};

I18N._MARKERCHAR = "␚";

/**
 * Add a translation to the dictionary.
 * 
 * @param original {string}
 * @param translation {string}
 * @param type {?object} Plural or gender for categorise() based advanced multiple-choice translations. 
 */
I18N.prototype.add = function(original, translation, type) {
  // TODO unescape tab, \r\n and #?
  var vars=[], tvars=[];
  var key = this.canon(original, vars);  
  var meaning = this.canon(translation, vars, true);
  // Check for multiple translations, keep multiple translations
  var old = this.en2lang[key];
  if (old && old !== meaning) {
	  if (typeof(old)==='string') {
		  old = [old];
	  }
	  old.push([original, meaning, type]);
	  this.en2lang[key] = old;
  } else { // normal case
	  this.en2lang[key] = meaning;
  }
};

/**
 * @param file {string} csv text, tab separated, # to comment out lines
 * 1st-column: original, 2nd-column: Translation, 3rd or more: ignored (can use for comments)
 * @private
 */
I18N.prototype._parseFile = function (file) {
	  var lines = file.split(/[\r\n]/);
	  for(var i=0; i<lines.length; i++) {
		  var line = lines[i];
		  // skip blank lines & comments
		  if ( ! line || line.charAt(0)=='#') continue;
		  var bits = line.split("\t");
		  if (bits.length < 2) continue;
		  this.add(bits[0], bits[1]);
		  // bits[2], if present, is just a comment
	  }
	  console.log("I18N", "loaded", this);
};

/**
 * Do a synchronous load of a csv file
 * @param data {string} The url
 */
I18N.prototype._loadFile = function(data) {
	this.file = data;
	var req = {
			async: false,
			cache: true
	};
	// Is it a cross-domain fetch? Probably yes
	var i = data.indexOf('//');
	var hostname = window.location? window.location : '';
	var hn = data.substring(i+2, i+2+hostname.length);
	if (true || i === -1 || (hostname && hn === hostname)) {
		// Our server :)
	} else {
		// jsonp with caching?? TODO Does CORS work to allow cross-domain?? try-catch??
		req.jsonpCallback='_i18nCallback';
		req.dataType='jsonp';
		console.log('I18N', 'Using asynchronous loading: The race is on (this is bad, and may produce unpredictable results). Please add SJTest.js for safer loading.');
	}
	// Fetch it
	this.loaded = false;
	$.ajax(data, req)
		.done(function(result) {
			this._parseFile(result);
		}.bind(this))
		.always(function() {
			this.loaded = true;
		}.bind(this));		
};

/**
 * @param english {string} Original text (often English)
 */
I18N.prototype.tr = function (english) {		
	var vars = [],
		key = this.canon(english, vars),
		trans = this.en2lang[key];
	// multiple translations?
	if(trans && typeof(trans)!=='string') {
		trans = this._tr2_multi(english, vars, trans);
	}
	
	if (trans) {
		return this.uncanon(trans, vars);
	}
	
	// fail -- Log it to the backend for translators to work on	
	if (this.loaded && english) {
		if (this.lang) this.onfail(english, this.lang, key);
	}

	// Remove {}s and (s)
	var _english = this.uncanon(key, vars);
	return _english;
}

/**
 * @param english {string} Raw-form to translate
 * @param vars {array} From canon()
 * @returns {string} translation to use 
 * @private
 */
I18N.prototype._tr2_multi = function(english, vars, trans) {
	// exact match?
	for(var j=1; j<trans.length; j++) {
		if (english === trans[j][0]) {
			return trans[j][1];
		}
	}
	// typed match?
	var category = {};
	for (var vi=0; vi<vars.length; vi++) {
		var cati = this.categorise(vars[vi]);
		if (cati) {
			for(p in cati) category[p] = cati[p];
		}
	}
	if (category === {}) {
		return trans[0];
	}
	for(var j=1; j<trans.length; j++) {
		var catj = trans[j][2];
		if ( ! catj) continue;
		var ok = true;
		for(p in catj) {
			if(category[p] !== catj[p]) {
				ok = false; break;
			}
		}
		if (ok) return trans[j][1];
	}
	// just use the first
	return trans[0];
};

/**
 * Is this plural or singular? Male or female?
 * @param {string} v - Variable value (probably a word or a number) to analyse;
 * @returns {object} 
 */
I18N.prototype.categorise = function(v) {
	return false;
};

/**
 * Called when we can't translate a phrase.
 * The default version is for a SoDash backend -- replace it with your own logging call!
 * @param english {string} The original text.
 * @param lang {string} The language we're translating to.
 * @param key {string} The internal lookup key, as produced by canon(). Useful if debugging corner cases.
 */
I18N.prototype.onfail = function(english, lang, key) {
	// ignore empty tags (It's easy enough with jQuery to try )
	try {
		if ( $(english).length > 0 && ! $(english).text()) {
			return;
		}
	} catch(ohwell) {}

	// Only log a fail once!
	if(this.fails[this.canon(english)]) return;
	// Mark it as logged.
	this.fails[this.canon(english)] = true;

	console.warn("I18N", "fail ("+lang+"): "+english+"	(internal key: "+key+")");
	if ( ! this.appTag) return;
	// canon the whitespace (but not variables, etc)
	english = english.replace(/\s+/g, ' ');
	// Send a cross-domain ping
	$.ajax({
		url: this.urlPrefix + '/lg.json',
		dataType: 'jsonp',
		data: {
			tag: 	this.appTag,
			msg:	lang+"\t"+english
		}
	});			
};

I18N.NUMBER = /[0-9,]+(\.\d+)?/g;
/**
 * numbers, emails, html tags -- keep them untranslated
 */
I18N.KEEPME = new RegExp(
		I18N.NUMBER.source
		+"|\{.*?\}|\b\S+@[a-zA-Z\.]+|<\/?[a-z][a-zA-Z0-9]*[^>]*?>", 'g');
	
/**
 * Convert into a canonical form for internal lookup.
 * @param varCatcher {array}, which will collect the raw versions of "variables", for uncanon to put back.
 * TODO OR the output from a previous canon(original), used to establish place-marker ordering in canon(translation).
 * @param varOrder {?boolean} If true, varCatcher is interpreted as the output from a previous canon().
 * @returns The "canonical" form -- with variable markers, standardised whitespace, etc. 
 */
I18N.prototype.canon = function (english, varCatcher, varOrder) {
	if ( ! english) return english;
	if (varCatcher === undefined) varCatcher = []; 
	// Replace untranslated stuff with markers: numbers, {wrapped}, emails, html tags
	var _canon = english.replace(I18N.KEEPME, function(m) {
		if ( ! varOrder) {					
			var vi = varCatcher.length;
			varCatcher.push(m);
			return I18N._MARKERCHAR+vi; // Mark the place
		}
		// Which marker?
		var vi = varCatcher.indexOf(m);
		if (vi==-1) {
			return m; // A new var-like thing. Leave it alone.
		}
		return I18N._MARKERCHAR+vi;
	});
	// standardise whitespace as " "
	// TODO trim -- but we should preserve leading/trailing whitespace to avoid wordsbeingstucktogether.
	_canon = _canon.replace(/\s+/g, ' ');
	return _canon;
};

/**
 * Inverse of canon. Sort of.
 * @param canon The output from canon
 * @param vars The varCatcher array from canon.
 */
I18N.prototype.uncanon = function (canon, vars) {
	if ( ! canon) return canon;
	var uncanon = canon;
	// (s) -- done before vars are put in, as they shouldnt be edited.
	if (vars.length!=0) uncanon = this._uncanon2_pluralise(canon, vars);
	// vars
	for(var vi=0; vi<vars.length; vi++) {
		var v = vars[vi];
		// Convert Dates and numbers
		v = this._uncanon2_convert(v);
		// Insert v back into the string
		uncanon = uncanon.replace(I18N._MARKERCHAR+vi, v);
	}
	return uncanon;
};

/**
 * @param v {string} 
 * @returns formatted version of v, e.g. numbers are run through numberFormat()
 */
I18N.prototype._uncanon2_convert = function(v) {
	// TODO Maybe move the is number/date tests into key-storage (using different marker-chars), for some repeated-use efficiency.
	// ...Is it a number?
	if (this.numberFormat) {
		var n = Number(v);
		if ( ! isNaN(n)) return this.numberFormat(v);
	}
	// ...Is it a date?
	if (this.dateFormat) {
		var d = Date(v);
		if (!isNaN(d.valueOf())) {
			return this.dateFormat(d);
		}
	}
	// Remove wrapping {}s if present
	if (v.length>1 && v.charAt(0)=='{' && v.charAt(v.length-1)=='}') {
		v = v.substring(1, v.length-1);
	}
	
	return v;
};

/**
 * Convert (s) endings into s or ""
 * @param text {string} e.g. "$0 monkey(s)"
 * @param vars Placeholder values, e.g. [2]
 * @returns {string} e.g. "2 monkeys" 
 * @private
 */
I18N.prototype._uncanon2_pluralise = function(text, vars) {
	// ??we'd get a small efficiency boost if we cached whether a key requires plural handling
	var isPlural = null;
	for(var vi=0; vi<vars.length; vi++) {
		var vs = ''+vars[vi];
		if (vs.match(I18N.NUMBER)) {
			if (vs==='1' || vs==='1.0') isPlural = false;
			else isPlural = true;
			break;
		}
	}
	if (isPlural===true) {
		// Get the correction from the translation ??should we use a more defensive regex??
		text = text.replace(/(\w)\((\w{1,3})\)/g, '$1$2');
	} else if (isPlural===false) {
		text = text.replace(/(\w)\(\w{1,3}\)/g, '$1');
	}
	return text;
};

/**
 * Try to guess the user's language from the browser.
 * @returns language code (which could be incorrect), or null
 */
I18N.getBrowserLanguage = function() {
	var locale = navigator && (navigator.language || navigator.userLanguage);
	if (locale) {
		// chop down "en-GB" to just "en"
		var lang = locale.substring(0,2);
		return lang; 
	}
	return null;
};

/**
 * Find out if there's a translation available for this string
 * @param english
 */
I18N.prototype.canTranslate = function(english) {
	var vars = [],
	key = this.canon(english, vars);
	if(this.en2lang[key]) return true;
	return false;
};

/* jQuery plugin
 * Define $().tr(), which applies translation from the most recent I18N object */
(function ( $ ) {
	/** 
	 * Translate the element(s).
	 * @param i18n {?I18N} If unset, use the latest made/active one, or make a new one. */
	$.fn.tr = function(i18n) {
		if ( ! i18n) i18n = I18N.active || new I18N();
	    return this.each(function() {
	    	var $el = $(this);
	    	// Store the raw version (in case we switch languages later)
	    	var raw = $el.data('i18n-raw');
	    	if ( ! raw) {
	    		raw = $el.html();
	    		$el.data('i18n-raw', raw);
	    	}	    	
	    	var trans = i18n.tr(raw);
	    	$el.html(trans);
	    });
	};
}(jQuery));
