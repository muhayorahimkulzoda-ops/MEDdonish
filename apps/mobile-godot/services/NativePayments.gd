extends RefCounted
class_name NativePayments

static func start_purchase(sku: String, order_id: String) -> void:
	MEDdonishHost.start_purchase(sku, order_id)

static func attach_receipt(order_id: String, source: String, purchase_token: String) -> void:
	if order_id == "" or purchase_token == "":
		return
	await ApiClient.post_json("/orders/%s/store-receipt" % order_id, {
		"purchaseToken": purchase_token,
		"source": source,
	})

static func buy_course(_course_id: String, _plan_code: String) -> void:
	push_warning("Create a pending order first. A store SKU does not grant entitlement.")
