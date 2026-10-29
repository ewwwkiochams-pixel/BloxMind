-- BloxMind plugin for Roblox Studio.
-- Installed by the BloxMind desktop app. It talks to the app on this computer only (127.0.0.1).

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")
local LogService = game:GetService("LogService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")

local BASE = "http://127.0.0.1:__PORT__"
local TOKEN = "__TOKEN__"

local toolbar = plugin:CreateToolbar("BloxMind")
local toggle = toolbar:CreateButton("BloxMind", "Open the BloxMind panel", "")
local widget = plugin:CreateDockWidgetPluginGui(
	"BloxMindPanel",
	DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, true, false, 320, 560, 280, 380)
)
widget.Title = "BloxMind"
toggle.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

local function call(method, path, body)
	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url = BASE .. path,
			Method = method,
			Headers = { ["Content-Type"] = "application/json", ["X-BloxMind"] = TOKEN },
			Body = body and HttpService:JSONEncode(body) or nil,
		})
	end)
	if ok and res.Success then
		local decoded = nil
		pcall(function()
			decoded = HttpService:JSONDecode(res.Body)
		end)
		return true, decoded
	end
	return false, nil
end

local function make(class, props, parent)
	local o = Instance.new(class)
	for k, v in pairs(props) do
		o[k] = v
	end
	o.Parent = parent
	return o
end

local WHITE = Color3.fromRGB(245, 245, 247)
local MUTED = Color3.fromRGB(150, 150, 160)

local root = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(10, 10, 12), BorderSizePixel = 0 }, widget)
make("UIPadding", {
	PaddingTop = UDim.new(0, 12), PaddingBottom = UDim.new(0, 12),
	PaddingLeft = UDim.new(0, 12), PaddingRight = UDim.new(0, 12),
}, root)
make("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, root)

make("TextLabel", {
	LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 24), BackgroundTransparency = 1, Text = "BloxMind",
	Font = Enum.Font.GothamBold, TextSize = 20, TextColor3 = WHITE, TextXAlignment = Enum.TextXAlignment.Left,
}, root)
local modelLabel = make("TextLabel", {
	LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 20), BackgroundTransparency = 1, Text = "Connecting to the BloxMind app...",
	Font = Enum.Font.Gotham, TextSize = 13, TextColor3 = MUTED, TextXAlignment = Enum.TextXAlignment.Left,
}, root)
local pickRow = make("Frame", { LayoutOrder = 3, Size = UDim2.new(1, 0, 0, 30), BackgroundTransparency = 1 }, root)
make("UIListLayout", {
	FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder,
}, pickRow)

local function button(text, order, parent, widthScale)
	local b = make("TextButton", {
		LayoutOrder = order, Size = UDim2.new(widthScale or 1, widthScale and -4 or 0, 0, 32), BackgroundColor3 = Color3.fromRGB(30, 30, 36),
		BorderSizePixel = 0, Text = text, Font = Enum.Font.GothamBold, TextSize = 13, TextColor3 = WHITE, AutoButtonColor = true,
	}, parent)
	make("UICorner", { CornerRadius = UDim.new(0, 8) }, b)
	return b
end

local askBtn = button("Ask about the selected script", 4, root)
local errBtn = button("Send last errors to AI (0)", 5, root)

local box = make("TextBox", {
	LayoutOrder = 6, Size = UDim2.new(1, 0, 0, 150), BackgroundColor3 = Color3.fromRGB(18, 18, 22), BorderSizePixel = 0,
	Text = "", PlaceholderText = "Paste the AI's code here", PlaceholderColor3 = MUTED, MultiLine = true, TextWrapped = true,
	ClearTextOnFocus = false, Font = Enum.Font.Code, TextSize = 13, TextColor3 = WHITE,
	TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
}, root)
make("UICorner", { CornerRadius = UDim.new(0, 8) }, box)
make("UIPadding", { PaddingTop = UDim.new(0, 8), PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, box)

local insertRow = make("Frame", { LayoutOrder = 7, Size = UDim2.new(1, 0, 0, 32), BackgroundTransparency = 1 }, root)
make("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, insertRow)
local scriptBtn = button("Create Script", 1, insertRow, 0.5)
local localBtn = button("Create LocalScript", 2, insertRow, 0.5)

local status = make("TextLabel", {
	LayoutOrder = 8, Size = UDim2.new(1, 0, 0, 36), BackgroundTransparency = 1, Text = "", TextWrapped = true,
	Font = Enum.Font.Gotham, TextSize = 12, TextColor3 = MUTED, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
}, root)

local function setStatus(text, good)
	status.Text = text
	status.TextColor3 = good and Color3.fromRGB(63, 210, 122) or Color3.fromRGB(255, 120, 120)
end

local current = nil
local built = false
local pickButtons = {}

local function apply(state)
	current = state
	modelLabel.Text = "Model in Studio: " .. tostring(state.name)
	modelLabel.TextColor3 = Color3.fromRGB(state.r, state.g, state.b)
	if not built and state.models then
		built = true
		for i, m in ipairs(state.models) do
			local b = button(m.short, i, pickRow)
			b.Size = UDim2.new(0, 40, 1, 0)
			b.TextSize = 11
			b.BackgroundColor3 = Color3.fromRGB(m.r, m.g, m.b)
			b.TextColor3 = Color3.fromRGB(10, 10, 12)
			b.Activated:Connect(function()
				call("POST", "/model", { id = m.id })
			end)
			pickButtons[m.id] = b
		end
	end
	for id, b in pairs(pickButtons) do
		b.BackgroundTransparency = (id == state.model) and 0 or 0.65
	end
end

local function send(text, tpl)
	local ok = call("POST", "/ask", { text = text, tpl = tpl })
	if ok then
		setStatus("Sent. Switch to the BloxMind app.", true)
	else
		setStatus("Can't reach the BloxMind app. Is it running?", false)
	end
end

askBtn.Activated:Connect(function()
	local sel = Selection:Get()[1]
	if sel and sel:IsA("LuaSourceContainer") then
		send(sel.Source, "explain")
	else
		setStatus("Select a script in the Explorer first.", false)
	end
end)

local errors = {}
LogService.MessageOut:Connect(function(message, messageType)
	if messageType == Enum.MessageType.MessageError then
		table.insert(errors, message)
		if #errors > 10 then
			table.remove(errors, 1)
		end
		errBtn.Text = "Send last errors to AI (" .. #errors .. ")"
	end
end)
errBtn.Activated:Connect(function()
	if #errors == 0 then
		setStatus("No errors in the Output yet.", false)
		return
	end
	send(table.concat(errors, "\n"), "fix")
end)

local function clean(code)
	local fenced = code:match("```%w*\r?\n(.-)```")
	if fenced then
		return fenced
	end
	return code
end

local function insertScript(className, parent)
	local code = clean(box.Text)
	if code:gsub("%s", "") == "" then
		setStatus("Paste some code first.", false)
		return
	end
	ChangeHistoryService:SetWaypoint("BloxMind: before insert")
	local ok, err = pcall(function()
		local s = Instance.new(className)
		s.Name = "BloxMind" .. className
		s.Source = code
		s.Parent = parent
		Selection:Set({ s })
	end)
	ChangeHistoryService:SetWaypoint("BloxMind: inserted script")
	if ok then
		setStatus("Created a " .. className .. " in " .. parent.Name .. ".", true)
	else
		setStatus("Could not create the script: " .. tostring(err), false)
	end
end

scriptBtn.Activated:Connect(function()
	insertScript("Script", ServerScriptService)
end)
localBtn.Activated:Connect(function()
	local parent = StarterPlayer:FindFirstChild("StarterPlayerScripts") or StarterPlayer
	insertScript("LocalScript", parent)
end)

task.spawn(function()
	local shownError = false
	while true do
		local ok, state = call("GET", "/state")
		if ok and state then
			shownError = false
			apply(state)
		elseif not shownError then
			shownError = true
			modelLabel.Text = "Can't reach the BloxMind app. Is it running? If Studio asks, allow the connection."
			modelLabel.TextColor3 = Color3.fromRGB(255, 120, 120)
		end
		task.wait(2)
	end
end)
