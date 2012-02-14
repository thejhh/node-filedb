/* Simple JSON database */
var util = require('util'),
    events = require('events'),
    fs = require('fs'),
    path = require('path'),
    foreach = require('snippets').foreach;

/* Data */
function Data() {
	var self = this;
	events.EventEmitter.call(self);
	self._ready = false;
}
util.inherits(Data, events.EventEmitter);

/* Emit ready signal */
Data.prototype.ready = function() {
	var self = this;
	self._ready = true;
	self.emit('ready');
}

/* Wait until ready */
Data.prototype.whenReady = function(fn) {
	var self = this;
	if(self._ready) {
		fn();
		return;
	}
	self.on('ready', function() {
		fn();
	});
}

/* Load */
Data.prototype.load = function(target) {
	var self = this;
	fs.readFile(target, function (err, json_data) {
		if(err) {
			self.emit('error', err);
			return;
		}
		var data = JSON.parse(json_data);
		if(!data) {
			self.emit('error', 'Failed to read data');
		}
		foreach(data).each(function(v, k) {
			if(k[0] === '_') return;
			self[k] = v;
		});
		self.ready();
	});
	return self;
}

/* Save */
Data.prototype.save = function(target, fn) {
	var self = this,
	    data = {},
	    json_data,
	    now = new Date(),
	    target_bak,
	    target_tmp;
	
	if(!target) {
		fn('Target invalid: ' + target);
		return;
	}
	
	foreach(self).each(function(v, k) {
		if(k[0] === '_') return;
		data[k] = v;
	});
	json_data = JSON.stringify(data);
	if(!json_data) {
		fn('Failed to parse data!');
		return self;
	}
	
	target_bak = target + '.bak.' + now.getTime();
	target_tmp = target + '.tmp.' + now.getTime();
	
	//console.log('DEBUG: Writing to ' + target + ' data ' + json_data);
	
	// Save to temporary file
	fs.writeFile(target_tmp, json_data, 'utf8', function (err) {
		if(err) {
			fn(err);
			return;
		}
		path.exists(target, function(exists) {
			if(exists) {
				// Backup original file
				fs.rename(target, target_bak, function(err) {
					if(err) {
						fn(err);
						return;
					}
					
					// Change temporary file as primary
					fs.rename(target_tmp, target, function(err) {
						if(err) {
							fn(err);
							return;
						}
						fn();
					});
				});
				return;
			}
			
			// Change temporary file as primary
			fs.rename(target_tmp, target, function(err) {
				if(err) {
					fn(err);
					return;
				}
				fn();
			});
			
		});
	});
	return self;
}

/* Initialize */
Data.prototype.init = function(target) {
	var self = this;
	self._target = target;
	path.exists(target, function(exists) {
		if(exists) {
			self.load(target);
		} else {
			self.ready();
		}
	});
	return self;
}

/* Commit */
Data.prototype.commit = function(fn) {
	var self = this,
	    target = self._target;
	self.save(target, function(err) {
		fn(err);
	});
	return self;
}

/* Module */
var mod = module.exports = {};

mod.Data = Data;

mod.open = function(target) {
	var data = new Data();
	return data.init(target);
}
