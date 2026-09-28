extends Node

var base_url := "http://127.0.0.1:3000/api/v1"

func get_json(path: String) -> Dictionary:
	return await request(HTTPClient.METHOD_GET, path)

func post_json(path: String, payload: Dictionary = {}) -> Dictionary:
	return await request(HTTPClient.METHOD_POST, path, payload)

func patch_json(path: String, payload: Dictionary = {}) -> Dictionary:
	return await request(HTTPClient.METHOD_PATCH, path, payload)

func delete_json(path: String) -> Dictionary:
	return await request(HTTPClient.METHOD_DELETE, path)

func request(method: int, path: String, payload = null) -> Dictionary:
	var http := HTTPRequest.new()
	add_child(http)
	var headers := PackedStringArray([
		"Accept: application/json",
		"Content-Type: application/json",
	])
	if SessionManager.access_token != "":
		headers.append("Authorization: Bearer %s" % SessionManager.access_token)
	var ticket := MEDdonishHost.integrity_ticket()
	if ticket != "":
		headers.append("x-app-integrity: %s" % ticket)
	var body := ""
	if payload != null:
		body = JSON.stringify(payload)
	var err := http.request("%s%s" % [base_url, path], headers, method, body)
	if err != OK:
		http.queue_free()
		return {"ok": false, "status": 0, "data": {"code": "HTTP_ERROR"}}
	var completed: Array = await http.request_completed
	http.queue_free()
	var parsed = JSON.parse_string(completed[3].get_string_from_utf8())
	if parsed == null:
		parsed = {}
	return {
		"ok": completed[1] >= 200 and completed[1] < 300,
		"status": completed[1],
		"data": parsed,
	}
