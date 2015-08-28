var http = require('http');
var selectn = require('selectn');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var server = http.createServer(app);

var bitbucket_username = process.env.BITBUCKET_USERNAME;
var bitbucket_password = process.env.BITBUCKET_PASSWORD;
var port = process.env.PORT || 3040;
var host = process.env.HOST || '0.0.0.0';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/pullrequest/:werker_badge_id', function(req, res) {

    var badge_id = selectn('params.werker_badge_id', req);
    var repo = selectn('body.repository', req);
    var pr = selectn('body.pullrequest', req);

    if (!badge_id || !repo || !pr) {
        console.log('[Bitbucket-Wercker]:', 'error: bad params in webhook, werker_badge_id:', badge_id, 'repository', repo, 'pullrequest:', pullrequest);
        res.status(400).end();
        return;
    }

    var repository = {
        name: repo.name,
        owner: repo.owner.username
    };

    var pullrequest = {
        id: pr.id,
        title: pr.title,
        description: pr.description,
        reviewers: pr.reviewers,
        close_source_branch: pr.close_source_branch,
        source_branch: pr.source.branch.name
    };

    console.log('[Bitbucket-Wercker]:', 'new webhook, repository:', repository.owner + '/' + repository.name, 'pullrequest id:', pullrequest.id, 'title:', pullrequest.title);


    var status = '[![wercker status](https://app.wercker.com/status/' + badge_id + '/s/' + pullrequest.source_branch + ' "wercker status")](https://app.wercker.com/project/bykey/' + badge_id + ')';

    if (pullrequest.description.indexOf(status) !== 0) {
        pullrequest.description = pullrequest.description.replace(/(\[!\[wercker status\]\(.*\)\]\(.*\))/, '');
        pullrequest.description = status + '\r\n\r\n' + pullrequest.description;

        request({
            url: 'https://bitbucket.org/api/2.0/repositories/' + repository.owner + '/' + repository.name + '/pullrequests/' + pullrequest.id,
            method: 'PUT',
            auth: {
                user: bitbucket_username,
                pass: bitbucket_password,
                sendImmediately: false
            },
            json: pullrequest
        }, function(err, res, body) {
            if (err) {
                console.log('[Bitbucket-Wercker]:', 'error while updating pull request:', err);
                return;
            }
            console.log('[Bitbucket-Wercker]:', 'pull request status updated');
        });
    } else {
        console.log('[Bitbucket-Wercker]:', 'no update required for pull request');
    }

    res.status(200).end();
});

server.listen(port, host, function() {
    console.log('[Bitbucket-Wercker]:', 'server started at:', host + ':' + port);
});
