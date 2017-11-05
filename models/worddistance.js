/*
 * Calculate the distance of two words
 * 
 * Two different functions are provided:
 	- editDistance: calculates the Levenshtein distance
 	- simpleDistance: calculates a simple distance, just difference of characters in same position
 */

function distance(dictionary, i, j){
	if (i == 0 || j == 0){
		return Math.max(i,j)	
	} else {
		return dictionary[[i,j]];
	}
}

function setDistance(dictionary, y, x, word1, word2){
	dist1 = 1 + distance(dict, x-1, y);
	dist2 = 1 + distance(dict, x, y-1);
	dif = 0;
	if (word1[x-1] != word2[y-1]){
		dif = 1;
	}
	dist3 = dif + distance(dict, x-1, y-1);
	dict[[x,y]] = Math.min(dist1, dist2, dist3);
}

/*
 * Gets the levenshtein distances of two words
 */
function editDistance(word1, word2){
	dict = {};
	if (word1.length > word2.length){
		temp = word1
		word1 = word2
		word2 = temp
	}

	for (var i = 1; i <= word1.length; i++){
		for (var y = 1; y < i; y++){
			x = i - y;
			setDistance(dict, x, y, word1, word2)
		}
	}
	for (var i = word1.length + 1; i <= word1.length + word2.length; i++){
		for (var y = word1.length; y >= 1 && y >= i - word2.length; y--){
			x = i - y;
			setDistance(dict, x, y, word1, word2)
		}
	}
	return dict[[word1.length, word2.length]];
}

/*
 * Gets a simple distance of two words. Only compares characters of same position
 */
function simpleDistance(word1, word2){
	dist = 0;
	if (word1.length > word2.length){
		temp = word1
		word1 = word2
		word2 = temp
	}
	for (var i = 0; i < word1.length; i++){
		if (word1[i] != word2[i]){
			dist += 1;
		}
	}
	dist += (word2.length - word1.length)
	return dist;
}


console.log(editDistance("casas","cass"));
console.log(simpleDistance("casas","cass"));