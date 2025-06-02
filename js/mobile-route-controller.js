/**
 * Mobile Route Controller
 * Handles mobile-specific routing features and interactions
 */
class MobileRouteController {
    constructor(routingSystem) {
        this.routingSystem = routingSystem;
        this.currentPosition = null;
        this.watchId = null;
        this.navigationMode = false;
        this.savedRoutes = this.loadSavedRoutes();
        this.recentRoutes = this.loadRecentRoutes();
        
        this.init();
    }

    /**
     * Initialize mobile controller
     */
    init() {
        this.setupTouchHandlers();
        this.initializeGeolocation();
        this.loadUserPreferences();
        this.setupOfflineCache();
    }

    /**
     * Setup touch event handlers
     */
    setupTouchHandlers() {
        // Handle swipe gestures on bottom sheet
        const bottomSheet = document.getElementById('bottom-sheet');
        if (bottomSheet) {
            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            bottomSheet.addEventListener('touchstart', (e) => {
                if (e.target.classList.contains('sheet-handle')) {
                    startY = e.touches[0].clientY;
                    isDragging = true;
                }
            });

            bottomSheet.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;
                
                // Apply transform during drag
                if (deltaY > 0) {
                    bottomSheet.style.transform = `translateY(${deltaY}px)`;
                }
            });

            bottomSheet.addEventListener('touchend', () => {
                if (!isDragging) return;
                
                const deltaY = currentY - startY;
                bottomSheet.style.transform = '';
                
                // Determine whether to expand or collapse
                if (deltaY > 100) {
                    bottomSheet.classList.add('collapsed');
                } else if (deltaY < -100) {
                    bottomSheet.classList.remove('collapsed');
                }
                
                isDragging = false;
            });
        }

        // Handle map touch interactions
        if (this.routingSystem.map) {
            // Disable double-tap zoom for better mobile UX
            this.routingSystem.map.doubleClickZoom.disable();
            
            // Add custom touch controls
            this.routingSystem.map.on('contextmenu', (e) => {
                this.showContextMenu(e.latlng);
            });
        }
    }

    /**
     * Initialize geolocation tracking
     */
    initializeGeolocation() {
        if ('geolocation' in navigator) {
            // Request high accuracy location
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };

            // Get initial position
            navigator.geolocation.getCurrentPosition(
                (position) => this.updatePosition(position),
                (error) => this.handleLocationError(error),
                options
            );

            // Watch position for navigation
            this.watchId = navigator.geolocation.watchPosition(
                (position) => this.updatePosition(position),
                (error) => this.handleLocationError(error),
                options
            );
        }
    }

    /**
     * Update current position
     */
    updatePosition(position) {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        
        this.currentPosition = {
            lat: latitude,
            lng: longitude,
            accuracy,
            heading,
            speed: speed || 0
        };

        // Update map marker
        if (this.routingSystem.map) {
            if (!this.locationMarker) {
                // Create custom location marker
                const locationIcon = L.divIcon({
                    html: `
                        <div class="current-location-marker">
                            <div class="location-pulse"></div>
                            <div class="location-dot"></div>
                        </div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                this.locationMarker = L.marker([latitude, longitude], {
                    icon: locationIcon,
                    zIndexOffset: 1000
                }).addTo(this.routingSystem.map);
            } else {
                this.locationMarker.setLatLng([latitude, longitude]);
            }

            // Update accuracy circle
            if (!this.accuracyCircle) {
                this.accuracyCircle = L.circle([latitude, longitude], {
                    radius: accuracy,
                    color: '#4285F4',
                    fillColor: '#4285F4',
                    fillOpacity: 0.15,
                    weight: 1
                }).addTo(this.routingSystem.map);
            } else {
                this.accuracyCircle.setLatLng([latitude, longitude]);
                this.accuracyCircle.setRadius(accuracy);
            }
        }

        // Update navigation if active
        if (this.navigationMode && this.currentRoute) {
            this.updateNavigation();
        }
    }

    /**
     * Handle location errors
     */
    handleLocationError(error) {
        console.warn('Location error:', error);
        
        let message = 'Unable to get your location';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location permission denied';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out';
                break;
        }

        // Show user-friendly error
        this.showNotification(message, 'error');
    }

    /**
     * Start navigation mode
     */
    startNavigation(route) {
        this.navigationMode = true;
        this.currentRoute = route;
        this.currentSegmentIndex = 0;

        // Setup navigation UI
        this.showNavigationUI();

        // Keep screen awake
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(err => {
                console.log('Wake lock error:', err);
            });
        }

        // Start voice guidance
        this.initializeVoiceGuidance();

        // Update UI
        this.updateNavigationDisplay();
    }

    /**
     * Update navigation based on current position
     */
    updateNavigation() {
        if (!this.currentRoute || !this.currentPosition) return;

        const currentSegment = this.currentRoute.segments[this.currentSegmentIndex];
        if (!currentSegment) {
            this.completeNavigation();
            return;
        }

        // Calculate distance to next turn
        const distanceToTurn = this.calculateDistance(
            this.currentPosition,
            currentSegment.startPoint
        );

        // Check if we've reached the turn point
        if (distanceToTurn < 30) { // 30 meters threshold
            this.advanceToNextSegment();
        }

        // Update navigation display
        this.updateNavigationDisplay(distanceToTurn);

        // Provide voice guidance
        this.provideVoiceGuidance(distanceToTurn, currentSegment);
    }

    /**
     * Calculate distance between two points (in meters)
     */
    calculateDistance(point1, point2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = point1.lat * Math.PI / 180;
        const φ2 = point2.lat * Math.PI / 180;
        const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
        const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    /**
     * Initialize voice guidance
     */
    initializeVoiceGuidance() {
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
            this.lastSpokenDistance = null;
        }
    }

    /**
     * Provide voice guidance
     */
    provideVoiceGuidance(distance, segment) {
        if (!this.synthesis) return;

        // Determine when to speak
        const triggers = [800, 400, 100, 50]; // meters
        const trigger = triggers.find(t => 
            distance <= t && (!this.lastSpokenDistance || distance < this.lastSpokenDistance)
        );

        if (trigger) {
            this.lastSpokenDistance = trigger;
            
            let message = '';
            if (distance > 400) {
                message = `In ${Math.round(distance / 100) * 100} meters, ${segment.instruction}`;
            } else if (distance > 100) {
                message = `${segment.instruction} ahead`;
            } else {
                message = segment.instruction;
            }

            // Add road legality warning
            if (segment.legality.status === 'illegal') {
                message += '. Warning: This road exceeds your vehicle speed limit';
            } else if (segment.legality.status === 'caution') {
                message += '. Caution: Check local regulations';
            }

            this.speak(message);
        }
    }

    /**
     * Speak text using speech synthesis
     */
    speak(text) {
        if (!this.synthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        this.synthesis.speak(utterance);
    }

    /**
     * Show navigation UI
     */
    showNavigationUI() {
        // Create navigation overlay
        const navOverlay = document.createElement('div');
        navOverlay.id = 'navigation-overlay';
        navOverlay.className = 'fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 z-2000';
        navOverlay.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center">
                    <div id="nav-direction-icon" class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                        </svg>
                    </div>
                    <div>
                        <div id="nav-distance" class="text-2xl font-bold">--</div>
                        <div id="nav-instruction" class="text-sm opacity-90">Starting navigation...</div>
                    </div>
                </div>
                <button onclick="mobileController.stopNavigation()" class="p-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="flex items-center text-sm opacity-75">
                <span id="nav-speed">0 MPH</span>
                <span class="mx-2">•</span>
                <span id="nav-eta">--</span>
                <span class="mx-2">•</span>
                <span id="nav-remaining">--</span>
            </div>
        `;
        document.body.appendChild(navOverlay);
    }

    /**
     * Update navigation display
     */
    updateNavigationDisplay(distanceToTurn) {
        if (!this.navigationMode) return;

        const segment = this.currentRoute.segments[this.currentSegmentIndex];
        
        // Update distance
        const distanceEl = document.getElementById('nav-distance');
        if (distanceEl) {
            if (distanceToTurn > 1609) { // More than 1 mile
                distanceEl.textContent = `${(distanceToTurn / 1609.34).toFixed(1)} mi`;
            } else if (distanceToTurn > 150) {
                distanceEl.textContent = `${Math.round(distanceToTurn / 10) * 10} m`;
            } else {
                distanceEl.textContent = `${Math.round(distanceToTurn)} m`;
            }
        }

        // Update instruction
        const instructionEl = document.getElementById('nav-instruction');
        if (instructionEl && segment) {
            instructionEl.textContent = segment.instruction;
        }

        // Update speed
        const speedEl = document.getElementById('nav-speed');
        if (speedEl && this.currentPosition.speed !== null) {
            const speedMph = (this.currentPosition.speed * 2.237).toFixed(0);
            speedEl.textContent = `${speedMph} MPH`;
        }

        // Update ETA and remaining distance
        this.updateETADisplay();
    }

    /**
     * Update ETA display
     */
    updateETADisplay() {
        if (!this.currentRoute) return;

        // Calculate remaining segments
        const remainingSegments = this.currentRoute.segments.slice(this.currentSegmentIndex);
        const remainingDistance = remainingSegments.reduce((sum, seg) => sum + parseFloat(seg.distance), 0);
        
        // Estimate time based on current speed or average
        const avgSpeed = this.currentPosition.speed > 1 ? this.currentPosition.speed * 2.237 : 15; // MPH
        const remainingTime = (remainingDistance / avgSpeed) * 60; // minutes
        
        // Update displays
        const etaEl = document.getElementById('nav-eta');
        if (etaEl) {
            const eta = new Date(Date.now() + remainingTime * 60000);
            etaEl.textContent = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const remainingEl = document.getElementById('nav-remaining');
        if (remainingEl) {
            remainingEl.textContent = `${remainingDistance.toFixed(1)} mi`;
        }
    }

    /**
     * Advance to next segment
     */
    advanceToNextSegment() {
        this.currentSegmentIndex++;
        this.lastSpokenDistance = null;

        if (this.currentSegmentIndex < this.currentRoute.segments.length) {
            const nextSegment = this.currentRoute.segments[this.currentSegmentIndex];
            this.speak(`Now, ${nextSegment.instruction}`);
        }
    }

    /**
     * Complete navigation
     */
    completeNavigation() {
        this.speak('You have arrived at your destination');
        this.stopNavigation();
        
        // Save to recent routes
        this.addToRecentRoutes(this.currentRoute);
        
        // Show completion message
        this.showCompletionDialog();
    }

    /**
     * Stop navigation
     */
    stopNavigation() {
        this.navigationMode = false;
        
        // Remove navigation UI
        const overlay = document.getElementById('navigation-overlay');
        if (overlay) overlay.remove();
        
        // Release wake lock
        if (navigator.wakeLock) {
            navigator.wakeLock.release();
        }
        
        // Stop speech
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    /**
     * Show context menu at location
     */
    showContextMenu(latlng) {
        // Create context menu
        const menu = L.popup()
            .setLatLng(latlng)
            .setContent(`
                <div class="text-sm">
                    <button onclick="mobileController.setStart(${latlng.lat}, ${latlng.lng})" 
                            class="block w-full text-left p-2 hover:bg-gray-100">
                        Set as Start
                    </button>
                    <button onclick="mobileController.setDestination(${latlng.lat}, ${latlng.lng})" 
                            class="block w-full text-left p-2 hover:bg-gray-100">
                        Set as Destination
                    </button>
                    <button onclick="mobileController.addWaypoint(${latlng.lat}, ${latlng.lng})" 
                            class="block w-full text-left p-2 hover:bg-gray-100">
                        Add Waypoint
                    </button>
                </div>
            `)
            .openOn(this.routingSystem.map);
    }

    /**
     * Set start location
     */
    setStart(lat, lng) {
        document.getElementById('mobile-start').value = 'Selected on map';
        this.startCoords = { lat, lon: lng };
        
        // Add marker
        if (this.startMarker) this.startMarker.remove();
        this.startMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                html: '<div class="text-2xl">📍</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(this.routingSystem.map);
    }

    /**
     * Set destination
     */
    setDestination(lat, lng) {
        document.getElementById('mobile-end').value = 'Selected on map';
        this.endCoords = { lat, lon: lng };
        
        // Add marker
        if (this.endMarker) this.endMarker.remove();
        this.endMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                html: '<div class="text-2xl">🏁</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(this.routingSystem.map);
        
        // Auto-plan if both locations set
        if (this.startCoords && this.endCoords) {
            planRouteWithCoords(this.startCoords, this.endCoords);
        }
    }

    /**
     * Load saved routes
     */
    loadSavedRoutes() {
        return JSON.parse(localStorage.getItem('gem-saved-routes') || '[]');
    }

    /**
     * Load recent routes
     */
    loadRecentRoutes() {
        return JSON.parse(localStorage.getItem('gem-recent-routes') || '[]');
    }

    /**
     * Add to recent routes
     */
    addToRecentRoutes(route) {
        this.recentRoutes.unshift({
            id: Date.now(),
            date: new Date().toISOString(),
            start: document.getElementById('mobile-start').value,
            end: document.getElementById('mobile-end').value,
            route: route
        });
        
        // Keep only last 10 routes
        this.recentRoutes = this.recentRoutes.slice(0, 10);
        localStorage.setItem('gem-recent-routes', JSON.stringify(this.recentRoutes));
    }

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        const prefs = JSON.parse(localStorage.getItem('gem-route-preferences') || '{}');
        this.preferences = {
            avoidHighways: prefs.avoidHighways || false,
            preferCartPaths: prefs.preferCartPaths || true,
            voiceGuidance: prefs.voiceGuidance !== false,
            autoReroute: prefs.autoReroute !== false,
            ...prefs
        };
    }

    /**
     * Setup offline cache
     */
    setupOfflineCache() {
        if ('serviceWorker' in navigator) {
            // Register service worker for offline maps
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('Service worker registration failed:', err);
            });
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 left-4 right-4 p-4 rounded-lg shadow-lg z-2000 ${
            type === 'error' ? 'bg-red-500' : 'bg-gray-800'
        } text-white transform -translate-y-full transition-transform`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(-100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show completion dialog
     */
    showCompletionDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-2000';
        dialog.innerHTML = `
            <div class="bg-white rounded-lg p-6 m-4 max-w-sm">
                <div class="text-center">
                    <div class="text-5xl mb-4">🎉</div>
                    <h3 class="text-lg font-bold mb-2">You've Arrived!</h3>
                    <p class="text-sm text-gray-600 mb-4">
                        Great job navigating the legal route.
                    </p>
                    <div class="space-y-2">
                        <button onclick="mobileController.rateRoute()" 
                                class="w-full py-2 bg-green-600 text-white rounded-lg">
                            Rate This Route
                        </button>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="w-full py-2 border border-gray-300 rounded-lg">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    /**
     * Rate route
     */
    rateRoute() {
        // In a real app, this would save rating data
        alert('Route rating feature coming soon!');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileRouteController;
}