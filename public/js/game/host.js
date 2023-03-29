var states = {
	LOBBY: 0,
	INTRO: 1,
	ROUND_INTRO: 2,
	NOMINATE_PLAYERS1: 3,
	NOMINATE_PLAYERS2: 4,
	SELECT_TITLES: 5,
	CONTEST_TITLE: 6,
	VOTE_NOMINEES: 7,
	TITLE_VOTES: 8,
	TITLE_SCORES: 9,
	SCORES_UNSORTED: 10,
	SCORES_SORTED: 11,
	WINNER: 12,
	END: 13
};

function HostView(){
	var code = false;
	var state = false;
	var minPlayers = false;
	var maxPlayers = false;
	var players = false;
	var sortedPlayers = false;
	var audience = false;
	var round = false;
	var currentTitle = false;
	var nominees = false;
	var audienceVotes = false;
	var contested = false;
	var forfeit = false;
	var stalemate = false;
	
	this.init = function(){
		this.initSocket();
		this.bindViewEvents();
		this.bindSocketEvents();
		socket.emit('host_init');
	}
	
	this.initSocket = function(){
		socket = io.connect({
			'reconnection':true,
			'reconnectionDelay': 1000,
			'reconnectionDelayMax' : 1000,
			'reconnectionAttempts': 1000
		});
	}
	
	this.updateData = function(data){
		code = data.code;
		state = data.state;
		audience = data.audience;
		if(!minPlayers) minPlayers = data.min_players;
		if(!maxPlayers) maxPlayers = data.max_players;
		players = data.players;
		sortedPlayers = data.sorted_players;
		audience = data.audience;
		round = data.round;
		currentTitle = data.current_title;
		nominees = data.nominees;
		audienceVotes = data.audience_votes;
		contested = data.contested;
		forfeit = data.forfeit;
		stalemate = data.stalemate;
		this.updateView();
	}
	
	this.updateView = function(){
		$("#room_code").html("Code: " + code);
		if(state == states.LOBBY){
			$("#lobby").show();
			$("#game_start").hide();
			$("#lobby_room_code").html("<p>Code: " + code + "</p>");
			var html = "";
			if(players){
				for(let i = 0; i < maxPlayers; i++) html += "<p>" + (i < players.length ? players[i].name : "<i>join now!</i>") + "</p>";
				document.getElementById("btn_start_game").disabled = players.length < minPlayers;
				if(players.length < minPlayers) $("#btn_start_game").html((minPlayers - players.length) + (minPlayers - players.length > 1 ? " more players needed" : " more player needed"));
				else{
					$("#btn_start_game").html('Start Game');
					if(players.length == maxPlayers) html += "<p>" + (audience ? audience + " in audience" : "Join the audience!") + "</p>";
				}
			}
			else{
				for(let i = 0; i < maxPlayers; i++) html += "<p><i>join now!</i></p>";
				document.getElementById("btn_start_game").disabled = true;
				if(players.length < minPlayers) $("#btn_start_game").html(minPlayers + (minPlayers > 1 ? " more players needed" : " more player needed"));
			}
			$('#lobby_players').html(html);
		}
		else{
			$("#lobby").hide();
			$("#game_start").show();
			$("#game").show();
			$("#game_audience_count").html("<p>" + (audience ? audience + " in audience</p>" : "Join the audience!</p>"));
			if(state == states.INTRO){
				$("#intro").show();
				$("#intro").html("<p>Welcome to Hall of Lame!</p><p>For each round, you will nominate fellow players for two different superlative titles.</p><p>Everyone then votes for the nominee who most deserves each title. The title is awarded to the most popular nominee!</p>" + (audience && audience > 0 ? "<p>Audience members get to vote too. However, their collective vote weight is only equal to a single player vote.</p>" : ""));
			}
			else if(state == states.ROUND_INTRO){
				$("#intro").show();
				$("#intro").html(round == 0 ? "<p>Round 1</p><p>You receive points depending on how many votes your nominees receive, with a bonus if they win their respective title.</p><p>Remember: the nominees themselves and the players who chose them also vote. For each title awarded to a single player, everyone who voted for that player earns a big score bonus!</p>" : round == 1 ? "<p>Round 2</p><p>All points are doubled.</p>" : "<p>Final Round</p><p>This time, you will choose one of two titles to nominate yourself for.</p><p>Everyone else will then be able to contest the title by nominating themselves.</p><p>Players may get multiple votes per title depending on the total number of nominees.</p><p>Each player can only contest up to " + (players.length < 5 ? "2" : "3") + " times in total.</p><p>All points are tripled this round!</p>");
			}
			else $("#intro").hide();
			if(state == states.NOMINATE_PLAYERS1 || state == states.NOMINATE_PLAYERS2){
				$("#nominate_players").show();
				$("#nominate").html(state == states.NOMINATE_PLAYERS1 ? "<p>You have each been given a title on your device. Choose a nominee for the title now!</p>" : "<p>You have now each been given a different title, as well as the name of the player who has already been nominated for it. Choose a second nominee to contest the new title now!</p>");
				var html = "";
				for(let i = 0; i < players.length; i++) html += "<p>" + players[i].name + (players[i].finished ? " (done)" : " (not done)") + "</p>";
				$("#players_nominated").html(html);
			}
			else $("#nominate_players").hide();
			if(state == states.SELECT_TITLES){
				$("#select_titles").show();
				$("#select").html("<p>Select a title now!</p>");
				var html = "";
				for(let i = 0; i < players.length; i++) html += "<p>" + players[i].name + (players[i].finished ? " (done)" : " (not done)") + "</p>";
				$("#players_selected").html(html);
			}
			else $("#select_titles").hide();
			if(state == states.CONTEST_TITLE){
				$("#current_title").show();
				$("#show_title").html("<p>Most likely to: " + currentTitle + "</p>");
				$("#show_nominees").html(nominees.length ? "<p>" + players[nominees[0].nominee].name + " has nominated themselves for this title.</p>" : "<p>This title has been forfeited.</p>");
				$("#vote_prompt").show();
				$("#vote_prompt").html(contested ? "<p>Contesting players: " + contested + "</p>" : "<p>Think you can steal the title? Contest it now!</p>");
				$("#audience_votes").hide();
			}
			else if(state == states.VOTE_NOMINEES){
				$("#current_title").show();
				$("#show_title").html("<p>Most likely to: " + currentTitle + "</p>");
				var html = "";
				for(let i = 0; i < nominees.length; i++) html += "<p>" + players[nominees[i].nominee].name + "</p>";
				$("#show_nominees").html(html);
				$("#vote_prompt").show();
				$("#vote_prompt").html(round < 2 ? "<p>Vote now!</p>" : nominees.length < 4 ? "<p>Everyone gets one vote.</p>" : audience ? ("<p>Players get " + (nominees.length == 4 ? "2" : "3") + " votes.</p>" + "<p>Audience members get one vote.</p>") : ("<p>Everyone gets " + (nominees.length == 4 ? "2" : "3") + " votes.</p>"));
				if(audience){
					$("#audience_votes").show();
					$("#audience_votes").html("<p>Audience votes: " + audienceVotes + "</p>");
				}
				else $("#audience_votes").hide();
			}
			else if(state == states.TITLE_VOTES){
				$("#current_title").show();
				$("#show_title").html("<p>Most likely to: " + currentTitle + "</p>");
				var html = "";
				for(let i = 0; i < nominees.length; i++){
					var votes = "";
					if(round < 2){
						for(let j = 0; j < nominees[i].first_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].first_place_votes[j]].name;
					}
					else{
						for(let j = 0; j < nominees[i].first_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].first_place_votes[j]].name + " (1st)";
						for(let j = 0; j < nominees[i].second_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].second_place_votes[j]].name + " (2nd)";
						for(let j = 0; j < nominees[i].third_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].third_place_votes[j]].name + " (3rd)";
					}
					if(nominees[i].audience_percentage) votes += (votes ? " + Audience (" : "Votes: Audience (") + nominees[i].audience_percentage + "%)";
					if(!votes) votes = "<i>No votes received.</i>"
					html += "<div><p>Nominee: " + players[nominees[i].nominee].name + (nominees[i].forfeit ? " <i>(FORFEIT)</i>" : (round < 2 ? " (nominated by " + players[nominees[i].player].name + ")" : "") + (forfeit || stalemate ? "" : "</p><p>" + votes + "")) + "</p></div>";
				}
				$("#show_nominees").html(html);
				if(forfeit){
					$("#vote_prompt").show();
					$("#vote_prompt").html("FORFEIT");
				}
				else if(stalemate){
					$("#vote_prompt").show();
					$("#vote_prompt").html("STALEMATE");
				}
				else $("#vote_prompt").hide();
				$("#audience_votes").hide();
			}
			else if(state == states.TITLE_SCORES){
				$("#current_title").show();
				var html = "";
				for(let i = 0; i < nominees.length; i++){
					var votes = "";
					if(!forfeit && !stalemate){
						if(round < 2){
							for(let j = 0; j < nominees[i].first_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].first_place_votes[j]].name;
						}
						else{
							for(let j = 0; j < nominees[i].first_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].first_place_votes[j]].name + " (1st)";
							for(let j = 0; j < nominees[i].second_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].second_place_votes[j]].name + " (2nd)";
							for(let j = 0; j < nominees[i].third_place_votes.length; j++) votes += (votes ? " + " : "Votes: ") + players[nominees[i].third_place_votes[j]].name + " (3rd)";
						}
						if(nominees[i].audience_percentage) votes += (votes ? " + Audience (" : "Votes: Audience (") + nominees[i].audience_percentage + "%)";
					}
					if(!votes) votes = "<i>No votes received</i>";
					html += "<div><p>Nominee: " + players[nominees[i].nominee].name + (nominees[i].forfeit ? " <i>(FORFEIT)</i>" : ((round < 2 ? " (nominated by " + players[nominees[i].player].name + ")" : "") + (forfeit || stalemate ? "" : "</p><p>" + votes))) + "</p><p>Score: " + nominees[i].score + (nominees[i].contest_bonus ? " + " + nominees[i].contest_bonus + " contest bonus" : "") + (nominees[i].winner_bonus ? " + " + nominees[i].winner_bonus + " winner bonus" : "") + "</p></div>";
				}
				$("#show_nominees").html(nominees.length && !stalemate ? html : "<p>No one was awarded this title.</p>");
				$("#vote_prompt").hide();
				if(!stalemate){
					var winners = [];
					for(let i = 0; i < nominees.length; i++) if(nominees[i].winner_bonus) winners.push(nominees[i].nominee);
					if(winners.length){
						$("#vote_prompt").show();
						html = winners.length == 1 ? "<p>WINNER:</p>" : "<p>WINNERS:</p>";
						for(let i = 0; i < winners.length; i++) html += "<p>" + players[winners[i]].name + "</p>";
						$("#vote_prompt").html(html);
					}
					else $("#vote_prompt").hide();
				}
			}
			else $("#current_title").hide();
			if(state == states.SCORES_UNSORTED || state == states.SCORES_SORTED){
				$("#scores").show();
				var html = "<p>SCORES</p>";
				var currentScore;
				var currentRank;
				for(let i = 0; i < sortedPlayers.length; i++){
					const playerScore = players[sortedPlayers[i]].score;
					if(i == 0 || playerScore < currentScore){
						currentScore = playerScore;
						currentRank = i + 1;
					}
					html += "<p>" + currentRank + " " + players[sortedPlayers[i]].name + ": " + playerScore + "</p>";
				}
				$("#scores").html(html);
			}
			else $("#scores").hide();
			if(state == states.WINNER){
				$("#winner").show();
				var winners = [];
				var maxScore = 0;
				for(let i = 0; i < sortedPlayers.length; i++){
					var currentScore = players[sortedPlayers[i]].score;
					if(i == 0) maxScore = currentScore;
					if(currentScore == maxScore) winners.push(players[sortedPlayers[i]].name);
				}
				var html = winners.length > 1 ? "<p>WINNERS:<p>" : "<p>WINNER:</p>";
				for(let i = 0; i < winners.length; i++) html += "<p>" + winners[i] + "</p>";
				$("#winner").html(html);
			}
			else $("#winner").hide();
			if(state == states.END){
				$("#game").hide();
				$("#end").show();
				var maxWinnersNominated = 0;
				var maxTimesNominated = 0;
				var maxTitlesWon = 0;
				var maxWinnersVoted = 0;
				var maxTitlesStolen = 0;
				for(let i = 0; i < players.length; i++){
					const currentWinnersNominated = players[i].winners_nominated;
					if(currentWinnersNominated > maxWinnersNominated) maxWinnersNominated = currentWinnersNominated;
					const currentTimesNominated = players[i].times_nominated;
					if(currentTimesNominated > maxTimesNominated) maxTimesNominated = currentTimesNominated;
					const currentTitlesWon = players[i].titles_won;
					if(currentTitlesWon > maxTitlesWon) maxTitlesWon = currentTitlesWon;
					const currentWinnersVoted = players[i].winners_voted;
					if(currentWinnersVoted > maxWinnersVoted) maxWinnersVoted = currentWinnersVoted;
					const currentTitlesStolen = players[i].titles_stolen;
					if(currentTitlesStolen > maxTitlesStolen) maxTitlesStolen = currentTitlesStolen;
				}
				var mostWinnersNominated = [];
				var mostTimesNominated = [];
				var mostTitlesWon = [];
				var mostWinnersVoted = [];
				var mostTitlesStolen = [];
				for(let i = 0; i < players.length; i++){
					if(players[i].winners_nominated == maxWinnersNominated) mostWinnersNominated.push(i);
					if(players[i].times_nominated == maxTimesNominated) mostTimesNominated.push(i);
					if(players[i].titles_won == maxTitlesWon) mostTitlesWon.push(i);
					if(players[i].winners_voted == maxWinnersVoted) mostWinnersVoted.push(i);
					if(players[i].titles_stolen == maxTitlesStolen) mostTitlesStolen.push(i);
				}
				var html = "";
				if(mostWinnersNominated.length == 1) html += "<p>Most likely to nominate a winner: " + players[mostWinnersNominated[0]].name + " (nominated a winner " + maxWinnersNominated + " times)";
				if(mostTimesNominated.length == 1) html += "<p>Most likely to be nominated: " + players[mostTimesNominated[0]].name + " (nominated " + maxTimesNominated + " times)";
				if(mostTitlesWon.length == 1) html += "<p>Most likely to win a title: " + players[mostTitlesWon[0]].name + " (won " + maxTitlesWon + " titles)";
				if(mostWinnersVoted.length == 1) html += "<p>Most likely to vote for a winner: " + players[mostWinnersVoted[0]].name + " (voted for a winner " + maxWinnersVoted + " times)";
				if(mostTitlesStolen.length == 1) html += "<p>Most likely to steal a title: " + players[mostTitlesStolen[0]].name + " (stole " + maxTitlesStolen + " titles in the final round)";
				if(html){
					$("#end_titles").show();
					$("#end_titles").html(html);
				}
				else $("#end_titles").hide();
				html = "<p>FINAL SCORES</p>";
				for(let i = 0; i < sortedPlayers.length; i++) html += "<p>" + (i + 1) + " " + players[sortedPlayers[i]].name + ": " + players[sortedPlayers[i]].score + "</p>";
				$("#final_scores").html(html);
			}
			else $("#end").hide();
		}
	}
	
	this.bindViewEvents = function(){
		$('#btn_start_game').click(function(){
			if(!players || players.length < minPlayers) alert((players ? minPlayers - players.length : minPlayers) + (minPlayers - players.length > 1 ? " more players needed to start." : " more player needed to start."));
			else if(confirm("Start the game?")) socket.emit('host_start_game');
			return false;
		});
		$('#btn_continue').click(function(){
			socket.emit('host_continue');
			return false;
		});
		$('#btn_end_game').click(function(){
			socket.emit('host_end_game');
			return false;
		});
		$('#btn_leave_game').click(function(){
			if(confirm("Destroy the current game? All data associated with this game will be lost.")) socket.emit('host_leave_game');
			return false;
		});
		$('#btn_same_players').click(function(){
			if(confirm("Play again with the same players?")) socket.emit('host_start_game');
			return false;
		});
		$('#btn_new_players').click(function(){
			if(confirm("Start a new lobby? All players will be disconnected.")) socket.emit('host_new_lobby');
			return false;
		});
	}
	
	this.bindSocketEvents = function(){
		socket.on('host_init_ok', function(host){
			return function(data){
				host.updateData(data);
				return false;
			}
		}(this));
		socket.on('host_init_nok', function(){
			location.href = '/';
		});
		socket.on('host_players_update', function(host){
			return function(newPlayers){
				players = newPlayers;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_audience_update', function(host){
			return function(newAudience){
				audience = newAudience;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_state_update', function(host){
			return function(data){
				if(state != data.state) host.updateData(data);
				return false;
			}
		}(this));
		socket.on('host_set_audience_votes', function(host){
			return function(votes){
				if(state != states.VOTE_NOMINEES) return false;
				audienceVotes = votes;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_set_contested', function(host){
			return function(newContested){
				if(state != states.CONTEST_TITLE) return false;
				contested = newContested;
				host.updateView();
				return false;
			}
		}(this));
	}
}

$(document).ready(function(){
	var game = new HostView();
	game.init();
});