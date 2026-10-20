package com.vira.party;

import com.vira.common.PageResponse;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/parties")
public class PartyController {

    private final PartyService partyService;

    public PartyController(PartyService partyService) {
        this.partyService = partyService;
    }

    @GetMapping
    public PageResponse<PartyResponse> list(@RequestParam(required = false) String q, Pageable pageable) {
        return partyService.list(q, pageable);
    }

    @GetMapping("/{id}")
    public PartyResponse get(@PathVariable Long id) {
        return partyService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PartyResponse create(@Valid @RequestBody PartyRequest request) {
        return partyService.create(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        partyService.delete(id);
    }

    @PostMapping("/{id}/restore")
    public PartyResponse restore(@PathVariable Long id) {
        partyService.restore(id);
        return partyService.get(id);
}
}