/**
 * i18n.js	A simple flexible Javascript internationalisation system
 * Author: Daniel Winterstein
 * Version: 0.2
 * Copyright: Winterwell http://winterwell.com
 * Requires: jQuery for synchronous ajax loading.
 * License: MIT (a commercially friendly open source license)
 * 
 * 
 * https://en.wikipedia.org/wiki/Inflection:
 * In grammar, inflection or inflexion is the modification of a word to express different grammatical categories such as 
 * tense, mood, voice, aspect, person, number, gender and case.
 * 
 * It's interesting how limited the enterprise level complex systems are. 
 * E.g. No support for gender? It suggests that the language used in software is limited enough for "You have 5 message(s)" & similar to be the _only_
 * common complex case.
 * 
 * 
 * This may be the best that a lookup based system can do. Possibly the best that any system can do without requiring serious computer power.
 * 
 * 
 * simple but limited:
 * 
 * 
 * complex & limited
 * http://doc.qt.digia.com/qq/qq19-plurals.html
 * or
 * https://www.gnu.org/software/gettext/manual/html_node/Translating-plural-forms.html
 * 
 * 
 */

/**
 * @class I18N
 * @param {String} lang - Two-character ISO639 language code of the destination language, 
 * or a custom value for special languages (eg 'lolcat', or 'user-defined')
 * @param {?String} file - Contents of translation csv file for `lang`, OR a url to load a translation csv file.
 * Loading is done synchronously (it will block), using jQuery.
**/
function I18N(lang, file) {
	/** Two-character ISO639 language code of the destination language, 
 * or a custom value for special languages (eg 'lolcat', or 'user-defined') */
	this.lang = lang;
	/**
	 * {string} Used for reporting untranslatable items.
	 * @see I18N.onfail()
	 */
	this.MYTAG = false;
	/**
	 * {boolean} Is it safe to use this?
	 */
	this.loaded;
	
	this.en2lang = {};
	
	if ( ! file) {
		this.loaded = true;
		return;
	}

	this.loaded = false;
	// Is file one "word"? then treat it as a url!
	if (file.match(/^\S+$/)) {
		try {
			$.ajax(file, {
				async: false,
				success: this._parseFile
			});
			return;
		} catch(err) {
			/* Swallow file-load errors! That way you still get an I18N object */
			console.error(err);
		}
	}
	
	this._parseFile(file);
}

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
  var vars = [];
  var key = this.canon(original, vars);
  var meaning = this.canon(translation);
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
	  this.loaded = true;
};

/**
 * @param english English-language text
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
	
	// Log it to the backend for translators to work on	
	if (this.loaded && english) {
		// Remove {}s and (s)
		var _english = this.uncanon(key, vars);
		if (this.lang) this.onfail(english, this.lang, key);
		return _english;
	}
	// Not yet loaded -- do nothing (& try again later)
	return english;
}

/**
 * @param english {string} Raw-form to translate
 * @param vars {array} From canon()
 * @returns {string} translation to use 
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
	console.warn("I18N", "fail ("+lang+"): "+english+"	(internal key: "+key+")");
	if (this.MYTAG) {
		$.post('https://i18n.soda.sh/lg', {
			tags: 	"tr_"+this.MYTAG,
			msg:	lang+"\t"+english
		});
	}
};

I18N.NUMBER = /[0-9,]+(\.\d+)?/g;
/**
 * numbers, emails, html tags, a safe subset of punctuation
 */
I18N.KEEPME = new RegExp(
		I18N.NUMBER.source
		+"|\{.*?\}|\b\S+@[a-zA-Z\.]+|<\/?[a-z][a-zA-Z0-9]*[^>]*?>|([\?!\.,;:'\"]$)", 'g');
	
/**
 * Convert into a canonical form for internal lookup.
 * @param varCatcher array, which will collect the raw versions of "variables", for uncanon to put back.
 */
I18N.prototype.canon = function (english, varCatcher) {
	if ( ! english) return english;
	if (varCatcher === undefined) varCatcher = [];
	// Replace untranslated stuff with markers: numbers, {wrapped}, emails, tags, trailing punctuation
	var _canon = english.replace(I18N.KEEPME, function(m) {		
		var vi = varCatcher.length;
		varCatcher.push(m);
		return I18N._MARKERCHAR+vi; // Mark the place
	});
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
		var v = ""+vars[vi];
		// remove {}s
		if (v.length>1 && v.charAt(0)=='{' && v.charAt(v.length-1)=='}') {
			v = v.substring(1, v.length-1);
		}
		uncanon = uncanon.replace(I18N._MARKERCHAR+vi, v);
	}
	return uncanon;
};

/**
 * Convert (s) endings into s or ""
 * @param text {string} e.g. "$0 monkey(s)"
 * @param vars Placeholder values, e.g. [2]
 * @returns {string} e.g. "2 monkeys" 
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
