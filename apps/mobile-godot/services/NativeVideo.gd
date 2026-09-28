extends RefCounted
class_name NativeVideo

static func play(playback_url: String, watermark: String) -> void:
	MEDdonishHost.play_video(playback_url, watermark)
